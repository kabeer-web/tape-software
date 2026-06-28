import { useState, useContext } from 'react';
import { StockContext } from '../StockContext';
import { PlusCircle, Trash2, AlertTriangle, Package, Plus, Minus } from 'lucide-react';

const BRAND = 'Bell'; // Race, Tesco, Jhonson ke liye ye badlo
const LOW   = 20;
const PLY_OPTIONS  = ['5','6','8','10'];
const SIDE_OPTIONS = [
  { val:'Single', label:'Single (S/S)' },
  { val:'Double', label:'Double (D/S)' },
];

export default function BellCore() {
  const { inventory, addRoll, updateStock, removeItem, loading } = useContext(StockContext);
  const [filterSide, setFilterSide] = useState('');
  const [filterPly,  setFilterPly]  = useState('');
  const [addSide,    setAddSide]    = useState('');
  const [addPly,     setAddPly]     = useState('');
  const [addQty,     setAddQty]     = useState('');
  const [adjustVal,  setAdjustVal]  = useState({});
  const [msg,        setMsg]        = useState('');

  const filtered = inventory.filter(i =>
    i.brand    === BRAND &&
    i.category === 'Core' &&
    (filterSide==='' || i.side===filterSide) &&
    (filterPly ==='' || String(i.ply)===filterPly)
  );

  const totalQty = filtered.reduce((s,i)=>s+(Number(i.qty)||0),0);
  const lowCount = filtered.filter(i=>Number(i.qty)<LOW).length;

  const flash = (t) => { setMsg(t); setTimeout(()=>setMsg(''),3000); };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!addSide||!addPly||!addQty) { flash('❌ Sab fields fill karo'); return; }
    await addRoll({ brand:BRAND, category:'Core', side:addSide, ply:addPly, qty:parseInt(addQty) });
    setAddQty('');
    flash('✅ Core added!');
  };

  const handleRemove = (id) => {
    if (!window.confirm('Remove karna hai?')) return;
    removeItem(id);
  };

  const handleAdjust = (id, delta) => {
    const v = parseInt(adjustVal[id]) || 0;
    if (v <= 0) { flash('❌ Value enter karo'); return; }
    updateStock(id, delta > 0 ? v : -v);
    setAdjustVal(p=>({...p,[id]:''}));
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-[#22c55e] font-bold">Loading...</div>;

  return (
    <div className="text-white min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-black text-[#22c55e]">{BRAND} CORE</h1>
        <p className="text-gray-500 text-xs mt-1 uppercase tracking-widest">Core Stock Management</p>
      </div>

      {msg && (
        <div className={`mb-4 p-3 rounded-xl text-sm font-bold border ${msg.startsWith('✅')?'bg-[#22c55e]/10 border-[#22c55e]/40 text-[#22c55e]':'bg-red-500/10 border-red-500/40 text-red-400'}`}>
          {msg}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white/[0.03] border border-[#22c55e]/20 rounded-2xl p-4 flex items-center gap-3">
          <Package className="text-[#22c55e]" size={22}/>
          <div><p className="text-xl font-black text-[#22c55e]">{filtered.length}</p><p className="text-[10px] text-gray-500 uppercase">Entries</p></div>
        </div>
        <div className="bg-white/[0.03] border border-[#22c55e]/20 rounded-2xl p-4 flex items-center gap-3">
          <Package className="text-[#22c55e]" size={22}/>
          <div><p className="text-xl font-black text-[#22c55e]">{totalQty}</p><p className="text-[10px] text-gray-500 uppercase">Total Stock</p></div>
        </div>
        <div className="bg-white/[0.03] border border-yellow-500/20 rounded-2xl p-4 flex items-center gap-3">
          <AlertTriangle className="text-yellow-500" size={22}/>
          <div><p className="text-xl font-black text-yellow-500">{lowCount}</p><p className="text-[10px] text-gray-500 uppercase">Low Alert</p></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Filter */}
        <div className="bg-white/[0.03] p-5 rounded-2xl border border-[#22c55e]/20">
          <p className="text-xs text-gray-500 uppercase font-bold mb-3">Filter Stock</p>
          <div className="flex gap-3">
            <select value={filterSide} onChange={e=>setFilterSide(e.target.value)} className="w-full bg-black/40 p-3 rounded-xl border border-[#22c55e]/20 outline-none text-sm">
              <option value="">All Sides</option>
              {SIDE_OPTIONS.map(s=><option key={s.val} value={s.val}>{s.label}</option>)}
            </select>
            <select value={filterPly} onChange={e=>setFilterPly(e.target.value)} className="w-full bg-black/40 p-3 rounded-xl border border-[#22c55e]/20 outline-none text-sm">
              <option value="">All Ply</option>
              {PLY_OPTIONS.map(p=><option key={p} value={p}>{p} Ply</option>)}
            </select>
          </div>
        </div>

        {/* Add Form */}
        <form onSubmit={handleAdd} className="bg-white/[0.03] p-5 rounded-2xl border border-[#22c55e]/20 space-y-3">
          <p className="text-xs text-gray-500 uppercase font-bold">Add Core Stock</p>
          <div className="grid grid-cols-2 gap-3">
            <select value={addSide} onChange={e=>setAddSide(e.target.value)} required className="bg-black/40 p-3 rounded-xl border border-[#22c55e]/20 outline-none text-sm">
              <option value="">Select Side</option>
              {SIDE_OPTIONS.map(s=><option key={s.val} value={s.val}>{s.label}</option>)}
            </select>
            <select value={addPly} onChange={e=>setAddPly(e.target.value)} required className="bg-black/40 p-3 rounded-xl border border-[#22c55e]/20 outline-none text-sm">
              <option value="">Select Ply</option>
              {PLY_OPTIONS.map(p=><option key={p} value={p}>{p} Ply</option>)}
            </select>
          </div>
          <div className="flex gap-3">
            <input type="number" value={addQty} onChange={e=>setAddQty(e.target.value)} placeholder="Quantity" required className="w-full bg-black/40 p-3 rounded-xl border border-[#22c55e]/20 outline-none text-sm"/>
            <button type="submit" className="bg-[#22c55e] px-6 rounded-xl font-bold text-black hover:bg-[#1db954] transition flex items-center gap-2 text-sm whitespace-nowrap">
              <PlusCircle size={15}/> ADD
            </button>
          </div>
        </form>
      </div>

      {/* Table */}
      <div className="bg-white/[0.03] rounded-2xl border border-[#22c55e]/10 overflow-x-auto">
        <table className="w-full text-left min-w-[560px]">
          <thead className="bg-black/40 text-gray-500 text-[10px] uppercase font-bold">
            <tr>
              <th className="p-3">Date</th>
              <th className="p-3">Specs</th>
              <th className="p-3">Stock</th>
              <th className="p-3 text-center">Adjust</th>
              <th className="p-3 text-right">Remove</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length===0 ? (
              <tr><td colSpan={5} className="p-12 text-center text-gray-600">No stock found.</td></tr>
            ) : filtered.map(item=>{
              const qty   = Number(item.qty)||0;
              const isLow = qty < LOW;
              return (
                <tr key={item._id} className={`border-t border-white/5 hover:bg-white/[0.02] transition ${isLow?'bg-yellow-500/5':''}`}>
                  <td className="p-3 text-xs text-gray-500">{item.date||'—'}</td>
                  <td className="p-3">
                    <span className="font-bold text-sm">{item.side}</span>
                    <span className="mx-1.5 text-gray-600">·</span>
                    <span className="text-[#22c55e] font-bold text-sm">{item.ply} Ply</span>
                  </td>
                  <td className="p-3">
                    <span className={`font-black text-sm px-3 py-1 rounded-lg ${isLow?'bg-yellow-500/20 text-yellow-500':'bg-[#22c55e]/10 text-[#22c55e]'}`}>
                      {qty} pcs {isLow&&<span className="text-[8px] ml-1">LOW</span>}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center justify-center gap-2">
                      <input
                        type="number"
                        value={adjustVal[item._id]||''}
                        onChange={e=>setAdjustVal(p=>({...p,[item._id]:e.target.value}))}
                        className="w-16 bg-black/40 p-1.5 text-center rounded-lg border border-[#22c55e]/20 outline-none text-xs"
                        placeholder="0"
                      />
                      <button onClick={()=>handleAdjust(item._id,1)}  className="p-1.5 bg-[#22c55e] text-black rounded-lg hover:scale-110 transition"><Plus size={13}/></button>
                      <button onClick={()=>handleAdjust(item._id,-1)} className="p-1.5 bg-red-600 text-white rounded-lg hover:scale-110 transition"><Minus size={13}/></button>
                    </div>
                  </td>
                  <td className="p-3 text-right">
                    <button onClick={()=>handleRemove(item._id)} className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition"><Trash2 size={15}/></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
