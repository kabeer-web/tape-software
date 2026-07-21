import { useState, useContext } from 'react';
import { useParams } from 'react-router-dom';
import { StockContext } from './StockContext';
import { PlusCircle, AlertTriangle, Package, Trash2 } from 'lucide-react';

// Same page every Carton brand uses — which brand it's showing comes from
// the URL (/inventory/carton/:brand), managed from the Sidebar (add/rename/
// delete) instead of a file per brand like the old CARTON BRANDS/bell.jsx,
// race.jsx, tesco.jsx, jhonson.jsx did.
const LOW = 20;
const SIZES = [10, 10.5, 11, 12];

export default function CartonManager() {
  const { brand: brandParam } = useParams();
  const BRAND = decodeURIComponent(brandParam || '');
  const { inventory, upsertStock, updateStock, removeItem, loading } = useContext(StockContext);

  const [cartonType, setCartonType] = useState('');
  const [size, setSize] = useState('');
  const [qty, setQty] = useState('');
  const [adjustValue, setAdjustValue] = useState({});
  const [msg, setMsg] = useState('');

  const flash = (t) => { setMsg(t); setTimeout(()=>setMsg(''),3000); };

  const filtered = inventory.filter(i =>
    i.brand === BRAND &&
    i.category === 'Carton' &&
    (cartonType === '' || i.carton_type === cartonType || i.cartonType === cartonType) &&
    (size === '' || String(i.size) === size)
  );

  const totalQty = filtered.reduce((s, i) => s + (Number(i.qty) || 0), 0);
  const lowCount = filtered.filter(i => Number(i.qty) < LOW).length;

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!cartonType || !size || !qty) return;
    try {
      await upsertStock({
        brand: BRAND,
        category: 'Carton',
        carton_type: cartonType,
        size: String(size),
      }, Number(qty));
      setQty('');
      flash('✅ Carton added!');
    } catch (err) {
      flash('❌ Error adding stock');
    }
  };

  const handleRemove = (id) => {
    if (!window.confirm('Pakka remove karna hai?')) return;
    removeItem(id);
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-[#22c55e] font-bold animate-pulse">Loading Carton Stock...</div>;

  if (!BRAND) return <div className="text-center py-16 text-gray-500">Sidebar se ek Carton brand select karo.</div>;

  return (
    <div className="text-white min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-black text-[#22c55e]">{BRAND.toUpperCase()} CARTONS</h1>
        <p className="text-gray-500 text-xs mt-1 tracking-widest uppercase">Carton Inventory & Box Stock</p>
      </div>

      {msg && (
        <div className={`mb-4 p-3 rounded-xl text-sm font-bold border ${msg.startsWith('✅')?'bg-[#22c55e]/10 border-[#22c55e]/40 text-[#22c55e]':'bg-red-500/10 border-red-500/40 text-red-400'}`}>
          {msg}
        </div>
      )}

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
        <div className="bg-white/[0.03] p-5 rounded-2xl border border-[#22c55e]/20">
          <p className="text-xs text-gray-500 uppercase font-bold mb-3">Quick Filter</p>
          <div className="flex gap-3">
            <select value={cartonType} onChange={e => setCartonType(e.target.value)} className="w-full bg-black/40 p-3 rounded-xl border border-[#22c55e]/20 outline-none text-sm">
              <option value="">All Types</option>
              <option value="Small">Small</option>
              <option value="Large">Large</option>
            </select>
            <select value={size} onChange={e => setSize(e.target.value)} className="w-full bg-black/40 p-3 rounded-xl border border-[#22c55e]/20 outline-none text-sm">
              <option value="">All Sizes</option>
              {SIZES.map(s => <option key={s} value={s}>{s}"</option>)}
            </select>
          </div>
        </div>

        <form onSubmit={handleAdd} className="bg-white/[0.03] p-5 rounded-2xl border border-[#22c55e]/20 space-y-3">
          <p className="text-xs text-gray-500 uppercase font-bold">Add Box Stock</p>
          <div className="grid grid-cols-2 gap-3">
            <select value={cartonType} onChange={e => setCartonType(e.target.value)} required className="bg-black/40 p-3 rounded-xl border border-[#22c55e]/20 outline-none text-sm">
              <option value="">Type</option>
              <option value="Small">Small</option>
              <option value="Large">Large</option>
            </select>
            <select value={size} onChange={e => setSize(e.target.value)} required className="bg-black/40 p-3 rounded-xl border border-[#22c55e]/20 outline-none text-sm">
              <option value="">Size</option>
              {SIZES.map(s => <option key={s} value={s}>{s}"</option>)}
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

      <div className="bg-white/[0.03] rounded-2xl border border-[#22c55e]/10 overflow-x-auto">
        <table className="w-full text-left min-w-[500px]">
          <thead className="bg-black/40 text-gray-500 text-[10px] uppercase font-black">
            <tr>
              <th className="p-4">Date</th>
              <th className="p-4">Type</th>
              <th className="p-4">Size</th>
              <th className="p-4">Available Qty</th>
              <th className="p-4 text-center">Adjust Stock</th>
              <th className="p-4 text-right">Delete</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="p-12 text-center text-gray-600 font-bold">No Carton Entries Found.</td></tr>
            ) : filtered.map(item => {
              const currentQty = Number(item.qty) || 0;
              const isLow = currentQty < LOW;
              return (
                <tr key={item._id} className={`border-t border-white/5 hover:bg-white/[0.02] transition-all ${isLow ? 'bg-yellow-500/5' : ''}`}>
                  <td className="p-4 text-xs text-gray-500 font-bold">{item.date}</td>
                  <td className="p-4 text-sm font-bold uppercase tracking-widest">{item.carton_type || item.cartonType}</td>
                  <td className="p-4 text-sm font-black">{item.size}"</td>
                  <td className="p-4">
                    <span className={`font-black text-sm px-3 py-1 rounded-lg ${isLow ? 'bg-yellow-500/20 text-yellow-500' : 'bg-[#22c55e]/10 text-[#22c55e]'}`}>
                      {currentQty} PCS {isLow && <span className="ml-1 text-[8px] uppercase">Low</span>}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex justify-center items-center gap-2 animate-in slide-in-from-right-2">
                      <input
                        type="number"
                        className="w-16 bg-black/40 p-2 text-center rounded-lg border border-[#22c55e]/20 outline-none text-xs font-bold"
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
}
