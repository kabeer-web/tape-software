import { useState, useContext } from 'react';
import { StockContext, displayRoll, rollMatches } from '../StockContext';
import { Search, PlusCircle, MinusCircle, Pencil, Trash2, Check, X } from 'lucide-react';

const CAT    = 'Color';
const TITLE  = 'COLOR TAPE';
const LOW    = 50;
const COLORS = ['Black','White','Red','Blue','Green','Yellow','Brown','Orange','Pink','Silver'];

export default function Color() {
  const { inventory, addRoll, removeItem, issueYards, editItemYards, loading } = useContext(StockContext);
  const [search,    setSearch]    = useState('');
  const [issueQty,  setIssueQty]  = useState({});
  const [editingId, setEditingId] = useState(null);
  const [editVal,   setEditVal]   = useState('');

  const filtered = inventory.filter(i =>
    (i.category === CAT || i.type === CAT) &&
    rollMatches(i.rollNo || i.roll_no, search)
  );

  const totalYards = filtered.reduce((s,i)=>s+(Number(i.yards)||0),0);
  const lowCount   = filtered.filter(i=>Number(i.yards)<LOW).length;

  const handleAdd = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const yards = parseFloat(f.get('yards'));
    if (!yards||yards<=0) return;
    await addRoll({ category:CAT, color:f.get('color'), micron:f.get('micron'), width:'1280', yards });
    e.target.reset();
  };

  const handleIssue = (item) => {
    const qty = parseFloat(issueQty[item._id]);
    if (!qty||qty<=0) return;
    issueYards(item._id,qty);
    setIssueQty(p=>({...p,[item._id]:''}));
  };

  const handleRemove = (id) => { if(!window.confirm('Remove?')) return; removeItem(id); };
  const startEdit = (item) => { setEditingId(item._id); setEditVal(String(item.yards)); };
  const saveEdit  = (item) => {
    const v=parseFloat(editVal); if(isNaN(v)||v<0) return;
    editItemYards(item._id,v); setEditingId(null);
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-[#22c55e] font-bold">Loading...</div>;

  return (
    <div className="text-white min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-black text-[#22c55e]">{TITLE}</h1>
        <p className="text-gray-500 text-xs mt-1 uppercase tracking-widest">Jambo Roll Inventory</p>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white/[0.03] border border-[#22c55e]/20 rounded-2xl p-4">
          <p className="text-[10px] text-gray-500 uppercase font-bold">Total Rolls</p>
          <p className="text-xl font-black text-[#22c55e] mt-1">{filtered.length}</p>
        </div>
        <div className="bg-white/[0.03] border border-[#22c55e]/20 rounded-2xl p-4">
          <p className="text-[10px] text-gray-500 uppercase font-bold">Total Yards</p>
          <p className="text-xl font-black text-[#22c55e] mt-1">{totalYards.toFixed(0)}</p>
        </div>
        <div className="bg-white/[0.03] border border-yellow-500/20 rounded-2xl p-4">
          <p className="text-[10px] text-gray-500 uppercase font-bold">Low Stock</p>
          <p className="text-xl font-black text-yellow-500 mt-1">{lowCount}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <form onSubmit={handleAdd} className="bg-white/[0.03] p-5 rounded-2xl border border-[#22c55e]/20 space-y-3">
          <p className="text-xs text-gray-500 uppercase font-bold">Add New Roll</p>
          <div className="grid grid-cols-2 gap-3">
            <select name="color" required className="bg-black/40 p-3 rounded-xl border border-[#22c55e]/20 outline-none text-sm">
              <option value="">Color</option>
              {COLORS.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
            <select name="micron" required className="bg-black/40 p-3 rounded-xl border border-[#22c55e]/20 outline-none text-sm">
              <option value="">Micron</option>
              {[37,39,40,42,48].map(m=><option key={m} value={m}>{m}μ</option>)}
            </select>
          </div>
          <input name="yards" type="number" placeholder="Yards" required className="w-full bg-black/40 p-3 rounded-xl border border-[#22c55e]/20 outline-none text-sm"/>
          <button className="w-full bg-[#22c55e] text-black font-bold py-3 rounded-xl hover:bg-[#1db954] flex items-center justify-center gap-2 text-sm transition">
            <PlusCircle size={16}/> ADD TO STOCK
          </button>
        </form>
        <div className="bg-white/[0.03] p-5 rounded-2xl border border-[#22c55e]/20">
          <p className="text-xs text-gray-500 uppercase font-bold mb-3">Search Roll</p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#22c55e]/60" size={16}/>
            <input placeholder="Roll number..." className="w-full pl-9 p-3 bg-black/40 rounded-xl border border-[#22c55e]/20 outline-none focus:border-[#22c55e] text-sm" onChange={e=>setSearch(e.target.value)}/>
          </div>
        </div>
      </div>

      <div className="bg-white/[0.03] rounded-2xl border border-[#22c55e]/10 overflow-x-auto">
        <table className="w-full text-left min-w-[660px]">
          <thead className="bg-black/40 text-gray-500 text-[10px] uppercase font-bold">
            <tr><th className="p-3">Roll #</th><th className="p-3">Color</th><th className="p-3">Micron</th><th className="p-3">Yards</th><th className="p-3 text-center">Issue</th><th className="p-3 text-right">Actions</th></tr>
          </thead>
          <tbody>
            {filtered.length===0 ? <tr><td colSpan={6} className="p-12 text-center text-gray-600">No rolls found.</td></tr>
            : filtered.map(item=>{
              const isLow=Number(item.yards)<LOW;
              const isEdit=editingId===item._id;
              return (
                <tr key={item._id} className={`border-t border-white/5 hover:bg-white/[0.02] ${isLow?'bg-yellow-500/5':''}`}>
                  <td className="p-3 font-black text-[#22c55e]">#{displayRoll(item.rollNo || item.roll_no)}</td>
                  <td className="p-3 text-sm">{item.color||'—'}</td>
                  <td className="p-3 text-gray-400 text-sm">{item.micron}μ</td>
                  <td className="p-3">
                    {isEdit?(
                      <div className="flex items-center gap-1.5">
                        <input type="number" value={editVal} onChange={e=>setEditVal(e.target.value)} autoFocus className="w-20 bg-black/40 p-1.5 rounded-lg border border-[#22c55e]/40 outline-none text-sm"/>
                        <button onClick={()=>saveEdit(item)} className="p-1.5 bg-[#22c55e] text-black rounded-lg"><Check size={13}/></button>
                        <button onClick={()=>setEditingId(null)} className="p-1.5 bg-white/5 text-gray-400 rounded-lg"><X size={13}/></button>
                      </div>
                    ):(
                      <span className={`font-black text-sm ${isLow?'text-yellow-500':'text-white'}`}>
                        {item.yards}{isLow&&<span className="ml-2 text-[8px] bg-yellow-500/20 text-yellow-500 px-1.5 py-0.5 rounded">LOW</span>}
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center justify-center gap-2">
                      <input type="number" value={issueQty[item._id]||''} onChange={e=>setIssueQty(p=>({...p,[item._id]:e.target.value}))} className="bg-black/40 p-1.5 rounded-lg border border-[#22c55e]/20 w-16 text-center outline-none text-sm" placeholder="0"/>
                      <button onClick={()=>handleIssue(item)} className="p-1.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition"><MinusCircle size={15}/></button>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center justify-end gap-2">
                      {!isEdit&&<button onClick={()=>startEdit(item)} className="p-1.5 text-gray-500 hover:text-[#22c55e] rounded-lg transition"><Pencil size={14}/></button>}
                      <button onClick={()=>handleRemove(item._id)} className="p-1.5 text-gray-500 hover:text-red-500 rounded-lg transition"><Trash2 size={14}/></button>
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
