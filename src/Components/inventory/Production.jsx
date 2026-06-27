import { useState, useContext, useEffect, useMemo } from 'react';
import { StockContext } from './StockContext';
import { getInventoryByRoll, addProduction, getProductions, deleteProduction } from '../../api';
import { Factory, Search, Plus, Database, Trash2, CheckCircle2, AlertTriangle, Calculator, X } from 'lucide-react';

const CORE_BRANDS = ['Bell', 'Race', 'Tesco', 'Jhonson'];

const Production = () => {
  const { inventory, adjustStock, refreshInventory } = useContext(StockContext);
  const [tab, setTab] = useState('entry');
  const [rollInput, setRollInput] = useState('');
  const [rollFound, setRollFound] = useState(null);
  const [coreForm, setCoreForm] = useState({ side: '', brand: '', ply: '', qty: '', ypc: '' });
  const [productions, setProductions] = useState([]);
  const [msg, setMsg] = useState(null);

  useEffect(() => { refreshInventory(); getProductions().then(setProductions); }, []);

  const handleSearchRoll = async () => {
    if (!rollInput) return;
    const res = await getInventoryByRoll(rollInput);
    if (res) { setRollFound(res); setMsg({ text: "Roll Linked!", type: "success" }); }
    else setMsg({ text: "Roll not found!", type: "error" });
  };

  const matchingCore = useMemo(() => {
    return inventory.find(i => i.category === 'Core' && i.brand === coreForm.brand && (i.side === coreForm.side || (coreForm.side === 'D/S' && i.side === 'Double')) && String(i.ply) === String(coreForm.ply));
  }, [inventory, coreForm]);

  const totalYds = (Number(coreForm.qty) * Number(coreForm.ypc)).toFixed(2);
  const canSave = rollFound && matchingCore && Number(coreForm.qty) > 0;

  const handleSave = async () => {
    if (!canSave) return;
    try {
      await adjustStock(rollFound, 'yards', -Number(totalYds));
      await adjustStock(matchingCore, 'qty', -Number(coreForm.qty));
      const newProd = await addProduction({ date: new Date().toLocaleDateString('en-GB'), roll_no: rollFound.roll_no, core_brand: coreForm.brand, core_qty_used: coreForm.qty, yards_used: totalYds, roll_snapshot: rollFound, core_snapshot: matchingCore });
      setProductions([newProd, ...productions]);
      setMsg({ text: "Stock Updated & Record Saved!", type: "success" });
      setRollFound(null); setRollInput(''); setCoreForm({ side: '', brand: '', ply: '', qty: '', ypc: '' });
    } catch (e) { setMsg({ text: e.message, type: "error" }); }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-4xl font-black text-white uppercase italic"><Factory className="inline mr-3 text-emerald-500" size={36}/> SLITTING <span className="text-emerald-500">LINE</span></h1>
        <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
          <button onClick={() => setTab('entry')} className={`px-8 py-2 rounded-xl text-xs font-black transition ${tab==='entry'?'bg-emerald-500 text-black':'text-slate-500'}`}>ENTRY</button>
          <button onClick={() => setTab('history')} className={`px-8 py-2 rounded-xl text-xs font-black transition ${tab==='history'?'bg-emerald-500 text-black':'text-slate-500'}`}>LOGS</button>
        </div>
      </div>

      {msg && <div className={`p-4 mb-6 rounded-2xl font-bold flex items-center gap-3 border ${msg.type==='success'?'bg-emerald-500/10 border-emerald-500/30 text-emerald-400':'bg-red-500/10 border-red-500/30 text-red-400'}`}>{msg.text}</div>}

      {tab === 'entry' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="bg-white/[0.02] border border-white/5 p-8 rounded-[2.5rem]">
              <h2 className="text-xl font-black mb-6 uppercase flex items-center gap-2"><Database size={20} className="text-emerald-500"/> Find Jambo</h2>
              <div className="flex gap-3">
                <input value={rollInput} onChange={e=>setRollInput(e.target.value)} placeholder="Enter Roll #" className="flex-1 bg-black/40 p-4 rounded-2xl border border-white/10 outline-none focus:border-emerald-500 font-bold"/>
                <button onClick={handleSearchRoll} className="bg-emerald-500 text-black px-10 rounded-2xl font-black hover:scale-105 transition-all">SEARCH</button>
              </div>
              {rollFound && <div className="mt-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex justify-between items-center"><p className="font-bold">Roll #{rollFound.roll_no} — {rollFound.yards} yds available</p><button onClick={()=>setRollFound(null)}><X size={18}/></button></div>}
            </div>

            <div className="bg-white/[0.02] border border-white/5 p-8 rounded-[2.5rem]">
              <h2 className="text-xl font-black mb-6 uppercase flex items-center gap-2"><Calculator size={20} className="text-emerald-500"/> Core Details</h2>
              <div className="grid grid-cols-2 gap-4">
                <select className="bg-black/40 p-4 rounded-2xl border border-white/10 outline-none font-bold" value={coreForm.side} onChange={e=>setCoreForm({...coreForm, side:e.target.value})}><option value="">Side</option><option value="D/S">D/S</option><option value="S/S">S/S</option></select>
                <select className="bg-black/40 p-4 rounded-2xl border border-white/10 outline-none font-bold" value={coreForm.brand} onChange={e=>setCoreForm({...coreForm, brand:e.target.value})}><option value="">Brand</option>{CORE_BRANDS.map(b=><option key={b} value={b}>{b}</option>)}</select>
                <input placeholder="Ply" className="bg-black/40 p-4 rounded-2xl border border-white/10 outline-none font-bold" value={coreForm.ply} onChange={e=>setCoreForm({...coreForm, ply:e.target.value})}/>
                <input placeholder="Cores Qty" type="number" className="bg-black/40 p-4 rounded-2xl border border-white/10 outline-none font-bold" value={coreForm.qty} onChange={e=>setCoreForm({...coreForm, qty:e.target.value})}/>
                <input placeholder="Yds/Core" type="number" className="bg-black/40 p-4 rounded-2xl border border-white/10 outline-none font-bold col-span-2" value={coreForm.ypc} onChange={e=>setCoreForm({...coreForm, ypc:e.target.value})}/>
              </div>
              {matchingCore ? <p className="mt-4 text-xs text-emerald-500 font-bold">✓ Matching stock found: {matchingCore.qty} in DB</p> : <p className="mt-4 text-xs text-red-500 font-bold">× No matching stock in DB</p>}
            </div>
          </div>
          <div className="bg-emerald-500/5 border-2 border-emerald-500/20 rounded-[3rem] p-12 flex flex-col justify-center items-center text-center">
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-4">Production Summary</p>
            <p className="text-8xl font-black text-white tracking-tighter mb-2">{totalYds}</p>
            <p className="text-xl font-bold text-emerald-500 uppercase">Total Yards to Issue</p>
            <button onClick={handleSave} disabled={!canSave} className="mt-12 w-full bg-emerald-500 text-black py-6 rounded-[2rem] font-black text-2xl hover:scale-105 active:scale-95 transition-all shadow-[0_0_50px_rgba(16,185,129,0.3)] disabled:opacity-20">SAVE TO DATABASE</button>
          </div>
        </div>
      ) : (
        <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-white/5 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]"><tr><th className="p-6">Date</th><th>Roll #</th><th>Brand</th><th className="text-center">Yards</th><th className="text-right p-6">Action</th></tr></thead>
            <tbody className="divide-y divide-white/5">
              {productions.map(p => (
                <tr key={p._id} className="hover:bg-white/5 transition-colors"><td className="p-6 text-sm text-slate-500">{p.date}</td><td className="font-black text-white">#{p.roll_no}</td><td className="font-bold text-slate-300">{p.core_brand}</td><td className="text-center text-emerald-500 font-black">{p.yards_used}</td><td className="p-6 text-right"><button onClick={()=>deleteProduction(p._id).then(refreshInventory)} className="text-red-500 hover:bg-red-500/10 p-3 rounded-xl transition-all"><Trash2 size={18}/></button></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Production;
