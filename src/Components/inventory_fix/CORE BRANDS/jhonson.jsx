import { useState, useContext } from 'react';
import { StockContext } from '../StockContext';
import { PlusCircle, AlertTriangle, Package, Trash2 } from 'lucide-react';

const LOW = 20;
const BRAND = 'Jhonson'; // Race, Tesco, Jhonson ke liye ye badlo

const jhonson = () => {
  const { inventory, addRoll, updateStock, removeItem, loading } = useContext(StockContext);
  const [side, setSide] = useState('');
  const [ply, setPly] = useState('');
  const [qty, setQty] = useState('');
  const [adjustValue, setAdjustValue] = useState({});

  const filtered = inventory.filter(i =>
    i.brand === BRAND &&
    i.category === 'Core' &&
    (side === '' || i.side === side) &&
    (ply === '' || String(i.ply) === ply)
  );

  const totalQty = filtered.reduce((s, i) => s + (Number(i.qty) || 0), 0);
  const lowCount = filtered.filter(i => Number(i.qty) < LOW).length;
  
const handleAdd = (e) => {
  e.preventDefault();
  if (!side || !ply || !qty) return;
  // category: 'Core' add kiya gaya hai
  addRoll({ 
    brand: BRAND, 
    category: 'Core', 
    side: side, 
    ply: ply, 
    qty: parseInt(qty) 
  });
  setQty('');
};

  const handleRemove = (id) => {
    if (!window.confirm('Pakka remove karna hai?')) return;
    removeItem(id);
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-[#22c55e] font-bold">Loading...</div>;

  return (
    <div className="text-white min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-black text-[#22c55e]">{BRAND} CORE</h1>
        <p className="text-gray-500 text-xs mt-1">Core Stock Management</p>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white/[0.03] border border-[#22c55e]/20 rounded-2xl p-4 flex items-center gap-3">
          <Package className="text-[#22c55e]" size={22} />
          <div><p className="text-xl font-black text-[#22c55e]">{filtered.length}</p><p className="text-[10px] text-gray-500 uppercase">Entries</p></div>
        </div>
        <div className="bg-white/[0.03] border border-[#22c55e]/20 rounded-2xl p-4 flex items-center gap-3">
          <Package className="text-[#22c55e]" size={22} />
          <div><p className="text-xl font-black text-[#22c55e]">{totalQty}</p><p className="text-[10px] text-gray-500 uppercase">Total Cores</p></div>
        </div>
        <div className="bg-white/[0.03] border border-[#22c55e]/20 rounded-2xl p-4 flex items-center gap-3">
          <AlertTriangle className="text-yellow-500" size={22} />
          <div><p className="text-xl font-black text-yellow-500">{lowCount}</p><p className="text-[10px] text-gray-500 uppercase">Low Stock</p></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="bg-white/[0.03] p-5 rounded-2xl border border-[#22c55e]/20">
          <p className="text-xs text-gray-500 uppercase font-bold mb-3">Filter</p>
          <div className="flex gap-3">
            <select value={side} onChange={e => setSide(e.target.value)} className="w-full bg-black/30 p-2.5 rounded-xl border border-[#22c55e]/20 outline-none text-sm">
              <option value="">All Sides</option>
              <option value="Single">Single</option>
              <option value="Double">Double</option>
            </select>
            <select value={ply} onChange={e => setPly(e.target.value)} className="w-full bg-black/30 p-2.5 rounded-xl border border-[#22c55e]/20 outline-none text-sm">
              <option value="">All Ply</option>
              {['5','6','8','10'].map(p => <option key={p} value={p}>{p} Ply</option>)}
            </select>
          </div>
        </div>

        <form onSubmit={handleAdd} className="bg-white/[0.03] p-5 rounded-2xl border border-[#22c55e]/20 space-y-3">
          <p className="text-xs text-gray-500 uppercase font-bold">Add Stock</p>
          <div className="flex gap-3">
            <select value={side} onChange={e => setSide(e.target.value)} required className="w-full bg-black/30 p-2.5 rounded-xl border border-[#22c55e]/20 outline-none text-sm">
              <option value="">Side</option>
              <option value="Single">Single</option>
              <option value="Double">Double</option>
            </select>
            <select value={ply} onChange={e => setPly(e.target.value)} required className="w-full bg-black/30 p-2.5 rounded-xl border border-[#22c55e]/20 outline-none text-sm">
              <option value="">Ply</option>
              {['5','6','8','10'].map(p => <option key={p} value={p}>{p} Ply</option>)}
            </select>
          </div>
          <div className="flex gap-3">
            <input type="number" value={qty} onChange={e => setQty(e.target.value)} placeholder="Qty" required className="w-full bg-black/30 p-2.5 rounded-xl border border-[#22c55e]/20 outline-none text-sm" />
            <button type="submit" className="bg-[#22c55e] px-5 rounded-xl font-bold text-black hover:bg-[#1db954] flex items-center gap-2 text-sm whitespace-nowrap">
              <PlusCircle size={16} /> ADD
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white/[0.03] rounded-2xl border border-[#22c55e]/10 overflow-x-auto">
        <table className="w-full text-left min-w-[500px]">
          <thead className="bg-black/30 text-gray-500 text-xs uppercase">
            <tr>
              <th className="p-3">Date</th>
              <th className="p-3">Specs</th>
              <th className="p-3">Qty</th>
              <th className="p-3 text-center">Adjust</th>
              <th className="p-3 text-right">Remove</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={5} className="p-10 text-center text-gray-500">Koi entry nahi mili.</td></tr>
            ) : filtered.map(item => {
              const isLow = Number(item.qty) < LOW;
              return (
                <tr key={item._id} className={`border-t border-white/5 hover:bg-white/[0.02] ${isLow ? 'bg-yellow-500/5' : ''}`}>
                  <td className="p-3 text-sm text-gray-400">{item.date}</td>
                  <td className="p-3 font-mono text-sm">{item.side} · {item.ply} Ply</td>
                  <td className="p-3">
                    <span className={`font-bold text-sm ${isLow ? 'text-yellow-500' : 'text-[#22c55e]'}`}>
                      {item.qty} {isLow && <span className="text-[10px] bg-yellow-500/20 px-1.5 py-0.5 rounded-full ml-1">LOW</span>}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex justify-center items-center gap-2">
                      <input
                        type="number"
                        className="w-16 bg-black/30 p-1.5 text-center rounded-lg border border-[#22c55e]/20 outline-none text-sm"
                        onChange={e => setAdjustValue(p => ({ ...p, [item._id]: parseInt(e.target.value) || 0 }))}
                        placeholder="0"
                      />
                      <button onClick={() => updateStock(item._id, adjustValue[item._id] || 0)} className="px-3 py-1.5 bg-[#22c55e] text-black rounded-lg font-bold text-sm hover:bg-[#1db954]">+</button>
                      <button onClick={() => updateStock(item._id, -(adjustValue[item._id] || 0))} className="px-3 py-1.5 bg-red-600 rounded-lg font-bold text-sm hover:bg-red-500">-</button>
                    </div>
                  </td>
                  <td className="p-3 text-right">
                    <button onClick={() => handleRemove(item._id)} className="text-gray-400 hover:text-red-500 transition p-1">
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default jhonson;