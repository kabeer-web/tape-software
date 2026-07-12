import { useState, useContext } from 'react';
import { StockContext, displayRoll, rollMatches } from '../StockContext';
import { Search, PlusCircle, MinusCircle, Pencil, Trash2, Check, X, Package, Layers, AlertTriangle } from 'lucide-react';

const CAT = 'Clear';
const TITLE = 'CLEAR TAPE';
const LOW = 50;
const MICRONS = [37, 39, 40, 42,43,44,45, 48];
const WIDTHS = ['1280', '1600'];

export default function Clear() {
  const { inventory, addRoll, removeItem, issueYards, editItem, loading } = useContext(StockContext);
  const [search, setSearch] = useState('');
  const [issueQty, setIssueQty] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const fixedWidth = null;

  const filtered = inventory.filter(i =>
    (i.category === CAT || i.type === CAT) &&
    rollMatches(i.rollNo || i.roll_no, search)
  );

  const totalYards = filtered.reduce((s, i) => s + (Number(i.yards) || 0), 0);
  const lowCount = filtered.filter(i => Number(i.yards) < LOW).length;

  const handleAdd = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const yards = parseFloat(f.get('yards'));
    if (!yards || yards <= 0) return;
    const weight = parseFloat(f.get('weight')) || 0;
    const rollNoInput = String(f.get('rollNo') || '').trim();
    try {
      const payload = { category: CAT, micron: f.get('micron'), width: fixedWidth || f.get('width'), yards, weight };
      
      // Roll # box optional — leave blank and it auto-generates like before.
      if (rollNoInput) payload.rollNo = rollNoInput;
      await addRoll(payload);
      e.target.reset();
    } catch (err) {
      console.error(err);
      alert('Error adding stock: ' + err.message);
    }
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

  const startEdit = (item) => {
    setEditingId(item._id);
    setEditForm({
      rollNo: displayRoll(item.rollNo || item.roll_no),
      micron: String(item.micron ?? ''),
      width: String(item.width ?? fixedWidth ?? ''),
      
      weight: String(item.weight ?? ''),
      yards: String(item.yards ?? ''),
    });
  };
  const cancelEdit = () => { setEditingId(null); setEditForm({}); };

  const saveEdit = async (item) => {
    const yardsVal = parseFloat(editForm.yards);
    if (editForm.yards !== '' && isNaN(yardsVal)) return alert('Yards must be a number');
    const updates = {
      rollNo: editForm.rollNo,
      micron: editForm.micron,
      width: fixedWidth || editForm.width,
      weight: parseFloat(editForm.weight) || 0,
      yards: editForm.yards === '' ? undefined : yardsVal, // negative allowed on purpose — shortfall should be visible
    };
    
    try {
      await editItem(item._id, updates);
      cancelEdit();
    } catch (err) {
      console.error(err);
      alert('Update failed: ' + (err.message || 'that roll # may already be in use'));
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-[#22c55e] font-bold">Loading...</div>;

  return (
    <div className="text-white min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-black text-[#22c55e]">{TITLE}</h1>
        <p className="text-gray-500 text-xs mt-1">Jambo Roll Inventory</p>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white/[0.03] border border-[#22c55e]/20 rounded-2xl p-4 flex items-center gap-3">
          <Package className="text-[#22c55e] shrink-0" size={22} />
          <div><p className="text-xl font-black text-[#22c55e]">{filtered.length}</p><p className="text-[10px] text-gray-500 uppercase">Rolls</p></div>
        </div>
        <div className="bg-white/[0.03] border border-[#22c55e]/20 rounded-2xl p-4 flex items-center gap-3">
          <Layers className="text-[#22c55e] shrink-0" size={22} />
          <div><p className="text-xl font-black text-[#22c55e]">{totalYards.toFixed(2)}</p><p className="text-[10px] text-gray-500 uppercase">Total Yards</p></div>
        </div>
        <div className="bg-white/[0.03] border border-[#22c55e]/20 rounded-2xl p-4 flex items-center gap-3">
          <AlertTriangle className="text-yellow-500 shrink-0" size={22} />
          <div><p className="text-xl font-black text-yellow-500">{lowCount}</p><p className="text-[10px] text-gray-500 uppercase">Low Stock</p></div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <form onSubmit={handleAdd} className="bg-white/[0.03] p-5 rounded-2xl border border-[#22c55e]/20 space-y-3">
          <p className="text-xs text-gray-500 uppercase font-bold">Add New Roll (leave Roll # blank to auto-generate)</p>
          <div className="grid grid-cols-2 gap-3">
            
            <select name="micron" required className="bg-black/30 p-2.5 rounded-xl border border-[#22c55e]/20 outline-none text-sm">
              <option value="">Micron</option>
              {MICRONS.map(m => <option key={m} value={m}>{m}μ</option>)}
            </select>
            <select name="width" required className="bg-black/30 p-2.5 rounded-xl border border-[#22c55e]/20 outline-none text-sm">
              <option value="">Width</option>
              {WIDTHS.map(w => <option key={w} value={w}>{w}mm</option>)}
            </select>
          </div>
          <input name="rollNo" type="text" placeholder="Roll # (optional — auto if blank)" className="w-full bg-black/30 p-2.5 rounded-xl border border-[#22c55e]/20 outline-none text-sm" />
          <input name="yards" type="number" step="0.01" placeholder="Yards" required className="w-full bg-black/30 p-2.5 rounded-xl border border-[#22c55e]/20 outline-none text-sm" />
          <input name="weight" type="number" step="0.01" placeholder="Weight (KG)" className="w-full bg-black/30 p-2.5 rounded-xl border border-[#22c55e]/20 outline-none text-sm" />
          <button type="submit" className="w-full bg-[#22c55e] text-black font-bold py-2.5 rounded-xl hover:bg-[#1db954] flex items-center justify-center gap-2 text-sm transition">
            <PlusCircle size={16} /> ADD TO STOCK
          </button>
        </form>
        <div className="bg-white/[0.03] p-5 rounded-2xl border border-[#22c55e]/20">
          <p className="text-xs text-gray-500 uppercase font-bold mb-3">Search</p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#22c55e]/60" size={16} />
            <input placeholder="Roll # se search karo..." className="w-full pl-9 p-2.5 bg-black/30 rounded-xl border border-[#22c55e]/20 outline-none focus:border-[#22c55e] text-sm text-white placeholder:text-gray-500" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="bg-white/[0.03] rounded-2xl border border-[#22c55e]/10 overflow-x-auto">
        <table className="w-full text-left min-w-[760px]">
          <thead className="bg-black/30 text-gray-500 text-xs uppercase">
            <tr>
              <th className="p-3">Roll</th>
              
              <th className="p-3">Micron</th>
              <th className="p-3">Width</th>
              <th className="p-3">Yards</th>
              <th className="p-3">KG</th>
              <th className="p-3">Issue</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="p-10 text-center text-gray-500">Koi roll nahi mila.</td></tr>
            ) : filtered.map(item => {
              const yardsNum = Number(item.yards) || 0;
              const isLow = yardsNum < LOW;
              const isNegative = yardsNum < 0;
              const isEditing = editingId === item._id;
              return (
                <tr key={item._id} className={`border-t border-white/5 hover:bg-white/[0.02] ${isNegative ? 'bg-red-500/5' : isLow ? 'bg-yellow-500/5' : ''}`}>
                  <td className="p-3 font-bold text-sm">
                    {isEditing ? (
                      <input type="text" value={editForm.rollNo} onChange={e => setEditForm(f => ({ ...f, rollNo: e.target.value }))} className="w-20 bg-black/30 p-1.5 rounded-lg border border-[#22c55e]/40 outline-none text-sm" />
                    ) : displayRoll(item.rollNo || item.roll_no)}
                  </td>
                  
                  <td className="p-3 text-sm text-gray-400">
                    {isEditing ? (
                      <select value={editForm.micron} onChange={e => setEditForm(f => ({ ...f, micron: e.target.value }))} className="bg-black/30 p-1.5 rounded-lg border border-[#22c55e]/40 outline-none text-sm">
                        {MICRONS.map(m => <option key={m} value={m}>{m}μ</option>)}
                      </select>
                    ) : `${item.micron}μ`}
                  </td>
                  <td className="p-3 text-sm text-gray-400">
                    {isEditing && !fixedWidth ? (
                      <select value={editForm.width} onChange={e => setEditForm(f => ({ ...f, width: e.target.value }))} className="bg-black/30 p-1.5 rounded-lg border border-[#22c55e]/40 outline-none text-sm">
                        {WIDTHS.map(w => <option key={w} value={w}>{w}mm</option>)}
                      </select>
                    ) : `${item.width}mm`}
                  </td>
                  <td className="p-3">
                    {isEditing ? (
                      <input type="number" step="0.01" value={editForm.yards} onChange={e => setEditForm(f => ({ ...f, yards: e.target.value }))} className="w-24 bg-black/30 p-1.5 rounded-lg border border-[#22c55e]/40 outline-none text-sm" autoFocus />
                    ) : (
                      <span className={`font-bold text-sm ${isNegative ? 'text-red-500' : isLow ? 'text-yellow-500' : 'text-[#22c55e]'}`}>
                        {item.yards}
                        {isNegative && <span className="text-[10px] bg-red-500/20 px-1.5 py-0.5 rounded-full ml-1">SHORT</span>}
                        {!isNegative && isLow && <span className="text-[10px] bg-yellow-500/20 px-1.5 py-0.5 rounded-full ml-1">LOW</span>}
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-sm text-gray-400">
                    {isEditing ? (
                      <input type="number" step="0.01" value={editForm.weight} onChange={e => setEditForm(f => ({ ...f, weight: e.target.value }))} className="w-20 bg-black/30 p-1.5 rounded-lg border border-[#22c55e]/40 outline-none text-sm" />
                    ) : `${Number(item.weight || 0).toFixed(2)} kg`}
                  </td>
                  <td className="p-3"><input type="number" value={issueQty[item._id] || ''} onChange={e => setIssueQty(p => ({ ...p, [item._id]: e.target.value }))} className="bg-black/30 p-1.5 rounded-lg border border-[#22c55e]/20 w-16 text-center outline-none text-sm" placeholder="0" /></td>
                  <td className="p-3">
                    <div className="flex items-center justify-end gap-2">
                      {isEditing ? (
                        <>
                          <button onClick={() => saveEdit(item)} className="text-[#22c55e] p-1"><Check size={15} /></button>
                          <button onClick={cancelEdit} className="text-gray-500 p-1"><X size={15} /></button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => handleIssue(item)} className="text-red-500 flex items-center gap-1 text-xs font-bold hover:text-red-400"><MinusCircle size={13} /> Issue</button>
                          <button onClick={() => startEdit(item)} className="text-gray-400 hover:text-[#22c55e] p-1"><Pencil size={14} /></button>
                          <button onClick={() => handleRemove(item._id)} className="text-gray-400 hover:text-red-500 p-1"><Trash2 size={14} /></button>
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
    </div>
  );
}
