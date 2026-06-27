import { useState, useContext } from 'react';
import { StockContext } from '/src/Components/inventory/StockContext';
import { Search, PlusCircle, MinusCircle, Pencil, Trash2, Check, X, AlertTriangle } from 'lucide-react';

const LOW = 50;

const Clear = () => {
  const { inventory, addRoll, removeItem, issueYards, editItemYards, loading } = useContext(StockContext);
  const [search, setSearch] = useState('');
  const [issueQty, setIssueQty] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');

  // Category aur Type dono check kar rahe hain safety ke liye
  const filtered = inventory.filter(i =>
    (i.category === 'Clear' || i.type === 'Clear') &&
    String(i.rollNo || i.roll_no || '').includes(search)
  );

  const total1280 = filtered.filter(i => String(i.width) === '1280').reduce((s, i) => s + (Number(i.yards) || 0), 0);
  const total1600 = filtered.filter(i => String(i.width) === '1600').reduce((s, i) => s + (Number(i.yards) || 0), 0);
  const lowCount = filtered.filter(i => Number(i.yards) < LOW).length;

  const handleAdd = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const yards = parseFloat(f.get('yards'));
    if (!yards || yards <= 0) return;

    // FIX: Category 'Clear' lazmi bhejna hai auto-roll ke liye
    await addRoll({ 
      category: 'Clear', 
      type: 'Clear', 
      micron: f.get('micron'), 
      width: f.get('width'), 
      yards: yards 
    });
    e.target.reset();
  };

  const handleIssue = (item) => {
    const qty = parseFloat(issueQty[item._id]);
    if (!qty || qty <= 0) return;
    issueYards(item._id, qty);
    setIssueQty(p => ({ ...p, [item._id]: '' }));
  };

  const handleRemove = (id) => {
    if (!window.confirm('Pakka remove karna hai?')) return;
    removeItem(id);
  };

  const startEdit = (item) => { setEditingId(item._id); setEditValue(String(item.yards)); };
  const saveEdit = (item) => {
    const v = parseFloat(editValue);
    if (isNaN(v) || v < 0) return;
    editItemYards(item._id, v);
    setEditingId(null);
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-[#22c55e] font-bold animate-pulse">Loading Clear Stock...</div>;

  return (
    <div className="text-white min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-black text-[#22c55e]">CLEAR TAPE</h1>
        <p className="text-gray-500 text-xs mt-1 tracking-widest uppercase">Jambo Roll Inventory Management</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-white/[0.03] border border-[#22c55e]/20 rounded-2xl p-4">
          <p className="text-[10px] text-gray-500 uppercase font-bold">Total Rolls</p>
          <p className="text-xl font-black text-[#22c55e] mt-1">{filtered.length}</p>
        </div>
        <div className="bg-white/[0.03] border border-[#22c55e]/20 rounded-2xl p-4">
          <p className="text-[10px] text-gray-500 uppercase font-bold">1280mm Yards</p>
          <p className="text-xl font-black text-[#22c55e] mt-1">{total1280.toFixed(0)}</p>
        </div>
        <div className="bg-white/[0.03] border border-[#22c55e]/20 rounded-2xl p-4">
          <p className="text-[10px] text-gray-500 uppercase font-bold">1600mm Yards</p>
          <p className="text-xl font-black text-[#22c55e] mt-1">{total1600.toFixed(0)}</p>
        </div>
        <div className="bg-white/[0.03] border border-yellow-500/20 rounded-2xl p-4">
          <p className="text-[10px] text-gray-500 uppercase font-bold">Low Stock</p>
          <p className="text-xl font-black text-yellow-500 mt-1 flex items-center gap-1">
            <AlertTriangle size={16} />{lowCount}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <form onSubmit={handleAdd} className="bg-white/[0.03] p-5 rounded-2xl border border-[#22c55e]/20 space-y-3">
          <p className="text-xs text-gray-500 uppercase font-bold">Add New Roll (Auto Roll #)</p>
          <div className="grid grid-cols-2 gap-3">
            <select name="micron" required className="bg-black/40 p-3 rounded-xl border border-[#22c55e]/20 outline-none text-sm focus:border-[#22c55e]/50">
              <option value="">Micron</option>
              {[37,39,40,42,48].map(m => <option key={m} value={m}>{m}μ</option>)}
            </select>
            <select name="width" required className="bg-black/40 p-3 rounded-xl border border-[#22c55e]/20 outline-none text-sm focus:border-[#22c55e]/50">
              <option value="">Width</option>
              <option value="1280">1280mm</option>
              <option value="1600">1600mm</option>
            </select>
          </div>
          <input name="yards" type="number" placeholder="Enter Total Yards" required className="w-full bg-black/40 p-3 rounded-xl border border-[#22c55e]/20 outline-none text-sm focus:border-[#22c55e]/50" />
          <button type="submit" className="w-full bg-[#22c55e] text-black font-black py-3 rounded-xl hover:bg-[#1db954] transition-all flex items-center justify-center gap-2 text-sm">
            <PlusCircle size={18} /> ADD TO STOCK
          </button>
        </form>

        <div className="bg-white/[0.03] p-5 rounded-2xl border border-[#22c55e]/20">
          <p className="text-xs text-gray-500 uppercase font-bold mb-3">Search Inventory</p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#22c55e]/60" size={18} />
            <input placeholder="Roll number likhein..." className="w-full pl-10 p-3 bg-black/40 rounded-xl border border-[#22c55e]/20 outline-none focus:border-[#22c55e] transition-all text-sm" onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="bg-white/[0.03] rounded-2xl border border-[#22c55e]/10 overflow-x-auto">
        <table className="w-full text-left min-w-[600px]">
          <thead className="bg-black/40 text-gray-500 text-[10px] uppercase font-black">
            <tr>
              <th className="p-4">Roll #</th>
              <th className="p-4">Width</th>
              <th className="p-4">Micron</th>
              <th className="p-4">Yards</th>
              <th className="p-4 text-center">Issue Yards</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="p-16 text-center text-gray-600 font-bold">Inventory Empty or No Matches.</td></tr>
            ) : filtered.map(item => {
              const isLow = Number(item.yards) < LOW;
              const isEditing = editingId === item._id;
              return (
                <tr key={item._id} className={`border-t border-white/5 hover:bg-white/[0.02] transition-colors ${isLow ? 'bg-red-500/5' : ''}`}>
                  <td className="p-4 font-black text-[#22c55e] tracking-tighter">#{item.rollNo || item.roll_no}</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${String(item.width) === '1600' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20'}`}>
                      {item.width}mm
                    </span>
                  </td>
                  <td className="p-4 text-sm font-bold text-gray-400">{item.micron}μ</td>
                  <td className="p-4">
                    {isEditing ? (
                      <div className="flex items-center gap-1.5 animate-in fade-in zoom-in-95">
                        <input type="number" value={editValue} onChange={e => setEditValue(e.target.value)} className="w-24 bg-black/50 p-2 rounded-lg border border-[#22c55e]/50 outline-none text-sm font-bold" autoFocus />
                        <button onClick={() => saveEdit(item)} className="p-2 bg-[#22c55e] text-black rounded-lg"><Check size={14} /></button>
                        <button onClick={() => setEditingId(null)} className="p-2 bg-red-500/20 text-red-500 rounded-lg"><X size={14} /></button>
                      </div>
                    ) : (
                      <span className={`font-black text-sm ${isLow ? 'text-red-400' : 'text-white'}`}>
                        {item.yards} <span className="text-[9px] text-gray-500">YDS</span>
                        {isLow && <span className="ml-2 text-[8px] bg-red-500 text-white px-1.5 py-0.5 rounded uppercase">Low</span>}
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-2">
                       <input type="number" value={issueQty[item._id] || ''} onChange={e => setIssueQty(p => ({ ...p, [item._id]: e.target.value }))} className="bg-black/40 p-2 rounded-lg border border-[#22c55e]/20 w-20 text-center outline-none text-sm font-bold focus:border-red-500/50" placeholder="0" />
                       <button onClick={() => handleIssue(item)} className="bg-red-500/10 text-red-500 p-2 rounded-lg hover:bg-red-500 hover:text-white transition-all"><MinusCircle size={16} /></button>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-2">
                      {!isEditing && <button onClick={() => startEdit(item)} className="p-2 text-gray-500 hover:text-[#22c55e] hover:bg-[#22c55e]/10 rounded-lg transition-all"><Pencil size={16} /></button>}
                      <button onClick={() => handleRemove(item._id)} className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"><Trash2 size={16} /></button>
                    </div>
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

export default Clear;