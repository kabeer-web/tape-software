import { useState, useContext } from 'react';
import { StockContext } from '../StockContext';
import { PlusCircle, AlertTriangle, Package, Trash2 } from 'lucide-react';

const LOW = 20;
const BRAND = 'Bell'; // Race, Tesco, Jhonson ke liye sirf ye badlein

const BellCore = () => { // Component name capitalized (Best practice)
  const { inventory, addRoll, updateStock, removeItem, loading } = useContext(StockContext);
  const [side, setSide] = useState('');
  const [ply, setPly] = useState('');
  const [qty, setQty] = useState('');
  const [adjustValue, setAdjustValue] = useState({});

  // Filter logic
  const filtered = inventory.filter(i =>
    i.brand === BRAND &&
    i.category === 'Core' && // Category match hona zaroori hai
    (side === '' || i.side === side) &&
    (ply === '' || String(i.ply) === ply)
  );

  const totalQty = filtered.reduce((s, i) => s + (Number(i.qty) || 0), 0);
  const lowCount = filtered.filter(i => Number(i.qty) < LOW).length;

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!side || !ply || !qty) return;

    // FIX: category: 'Core' add kiya gaya hai
    await addRoll({ 
      brand: BRAND, 
      category: 'Core', // Yeh line missing thi
      side: side, 
      ply: ply, 
      qty: parseInt(qty) 
    });

    setQty('');
    // Clear selections optionally
    // setSide('');
    // setPly('');
  };

  const handleRemove = (id) => {
    if (!window.confirm('Pakka remove karna hai?')) return;
    removeItem(id);
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-[#22c55e] font-bold animate-pulse">Loading {BRAND} Cores...</div>;

  return (
    <div className="text-white min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-black text-[#22c55e]">{BRAND} CORE</h1>
        <p className="text-gray-500 text-xs mt-1 tracking-widest uppercase">Core Stock & Specification Management</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white/[0.03] border border-[#22c55e]/20 rounded-2xl p-4 flex items-center gap-3">
          <div className="p-2 bg-[#22c55e]/10 rounded-lg"><Package className="text-[#22c55e]" size={22} /></div>
          <div><p className="text-xl font-black text-[#22c55e]">{filtered.length}</p><p className="text-[10px] text-gray-500 uppercase font-bold">Entries</p></div>
        </div>
        <div className="bg-white/[0.03] border border-[#22c55e]/20 rounded-2xl p-4 flex items-center gap-3">
          <div className="p-2 bg-[#22c55e]/10 rounded-lg"><Package className="text-[#22c55e]" size={22} /></div>
          <div><p className="text-xl font-black text-[#22c55e]">{totalQty}</p><p className="text-[10px] text-gray-500 uppercase font-bold">Total Stock</p></div>
        </div>
        <div className="bg-white/[0.03] border border-yellow-500/20 rounded-2xl p-4 flex items-center gap-3">
          <div className="p-2 bg-yellow-500/10 rounded-lg"><AlertTriangle className="text-yellow-500" size={22} /></div>
          <div><p className="text-xl font-black text-yellow-500">{lowCount}</p><p className="text-[10px] text-gray-500 uppercase font-bold">Low Alert</p></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Filter Section */}
        <div className="bg-white/[0.03] p-5 rounded-2xl border border-[#22c55e]/20">
          <p className="text-xs text-gray-500 uppercase font-bold mb-3">Quick Search Filter</p>
          <div className="flex gap-3">
            <select value={side} onChange={e => setSide(e.target.value)} className="w-full bg-black/40 p-3 rounded-xl border border-[#22c55e]/20 outline-none text-sm focus:border-[#22c55e]/50">
              <option value="">All Sides</option>
              <option value="Single">Single Side (S/S)</option>
              <option value="Double">Double Side (D/S)</option>
            </select>
            <select value={ply} onChange={e => setPly(e.target.value)} className="w-full bg-black/40 p-3 rounded-xl border border-[#22c55e]/20 outline-none text-sm focus:border-[#22c55e]/50">
              <option value="">All Ply</option>
              {['5','6','8','10'].map(p => <option key={p} value={p}>{p} Ply</option>)}
            </select>
          </div>
        </div>

        {/* Add Section */}
        <form onSubmit={handleAdd} className="bg-white/[0.03] p-5 rounded-2xl border border-[#22c55e]/20 space-y-3">
          <p className="text-xs text-gray-500 uppercase font-bold">Add Core Inventory</p>
          <div className="grid grid-cols-2 gap-3">
            <select value={side} onChange={e => setSide(e.target.value)} required className="bg-black/40 p-3 rounded-xl border border-[#22c55e]/20 outline-none text-sm focus:border-[#22c55e]/50">
              <option value="">Select Side</option>
              <option value="Single">Single</option>
              <option value="Double">Double</option>
            </select>
            <select value={ply} onChange={e => setPly(e.target.value)} required className="bg-black/40 p-3 rounded-xl border border-[#22c55e]/20 outline-none text-sm focus:border-[#22c55e]/50">
              <option value="">Select Ply</option>
              {['5','6','8','10'].map(p => <option key={p} value={p}>{p} Ply</option>)}
            </select>
          </div>
          <div className="flex gap-3">
            <input type="number" value={qty} onChange={e => setQty(e.target.value)} placeholder="Quantity" required className="w-full bg-black/40 p-3 rounded-xl border border-[#22c55e]/20 outline-none text-sm" />
            <button type="submit" className="bg-[#22c55e] px-8 rounded-xl font-black text-black hover:bg-[#1db954] transition-all flex items-center gap-2 text-xs">
              <PlusCircle size={16} /> ADD STOCK
            </button>
          </div>
        </form>
      </div>

      {/* Inventory Table */}
      <div className="bg-white/[0.03] rounded-2xl border border-[#22c55e]/10 overflow-x-auto">
        <table className="w-full text-left min-w-[500px]">
          <thead className="bg-black/40 text-gray-500 text-[10px] uppercase font-black">
            <tr>
              <th className="p-4">Date Added</th>
              <th className="p-4">Specifications</th>
              <th className="p-4">Available Qty</th>
              <th className="p-4 text-center">Adjust Stock</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={5} className="p-12 text-center text-gray-600 font-bold tracking-widest uppercase">No Core Stock Found.</td></tr>
            ) : filtered.map(item => {
              const currentQty = Number(item.qty) || 0;
              const isLow = currentQty < LOW;
              return (
                <tr key={item._id} className={`border-t border-white/5 hover:bg-white/[0.02] transition-all ${isLow ? 'bg-yellow-500/5' : ''}`}>
                  <td className="p-4 text-xs text-gray-500 font-bold">{item.date}</td>
                  <td className="p-4">
                    <span className="text-sm font-black tracking-tight">{item.side}</span>
                    <span className="mx-2 text-gray-600">·</span>
                    <span className="text-xs font-bold text-[#22c55e]">{item.ply} Ply</span>
                  </td>
                  <td className="p-4">
                    <span className={`font-black text-sm px-3 py-1 rounded-lg ${isLow ? 'bg-yellow-500/20 text-yellow-500' : 'bg-[#22c55e]/10 text-[#22c55e]'}`}>
                      {currentQty} PCS {isLow && <span className="ml-1 text-[8px] uppercase">Low</span>}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex justify-center items-center gap-2">
                      <input
                        type="number"
                        className="w-16 bg-black/40 p-2 text-center rounded-lg border border-[#22c55e]/20 outline-none text-xs font-bold focus:border-[#22c55e]/50"
                        onChange={e => setAdjustValue(p => ({ ...p, [item._id]: parseInt(e.target.value) || 0 }))}
                        placeholder="0"
                      />
                      <button onClick={() => updateStock(item._id, adjustValue[item._id] || 0)} className="p-2 bg-[#22c55e] text-black rounded-lg hover:scale-110 transition-transform"><PlusCircle size={14}/></button>
                      <button onClick={() => updateStock(item._id, -(adjustValue[item._id] || 0))} className="p-2 bg-red-600 text-white rounded-lg hover:scale-110 transition-transform"><Trash2 size={14}/></button>
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <button onClick={() => handleRemove(item._id)} className="text-gray-600 hover:text-red-500 transition-colors p-2">
                      <Trash2 size={18} />
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

export default BellCore;