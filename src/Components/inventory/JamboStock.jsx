import { useContext } from 'react';
import { StockContext } from './StockContext';
import { NavLink } from 'react-router-dom';
import { Package, AlertTriangle, Layers, ArrowRight } from 'lucide-react';

const JAMBO_TYPES = [
  { cat:'Clear',      label:'Clear Tape',      path:'/inventory/jambo/clear' },
  { cat:'Lemon',      label:'Lemon Tape',      path:'/inventory/jambo/lemon' },
  { cat:'Tan',        label:'Tan Tape',         path:'/inventory/jambo/tan' },
  { cat:'SuperYellow',label:'Super Yellow',     path:'/inventory/jambo/super-yellow' },
  { cat:'SuperClear', label:'Super Clear',      path:'/inventory/jambo/super-clear' },
  { cat:'Color',      label:'Color Tape',       path:'/inventory/jambo/color-tape' },
  { cat:'Cloth',      label:'Cloth Tape',       path:'/inventory/jambo/cloth-tape' },
  { cat:'Masking',    label:'Masking Tape',     path:'/inventory/jambo/masking' },
  { cat:'Tissue',     label:'Tissue Tape',      path:'/inventory/jambo/tissue-tape' },
  { cat:'Foam',       label:'Foam Tape',        path:'/inventory/jambo/foam-tape' },
];

const LOW = 50;

export default function JamboStock() {
  const { inventory, loading } = useContext(StockContext);

  if (loading) return <div className="flex items-center justify-center h-64 text-[#22c55e] font-bold">Loading...</div>;

  const allJambo = inventory.filter(i => JAMBO_TYPES.map(t=>t.cat).includes(i.category||i.type));
  const totalRolls = allJambo.length;
  const totalYards = allJambo.reduce((s,i)=>s+(Number(i.yards)||0),0);
  const lowItems   = allJambo.filter(i=>Number(i.yards)<LOW).length;

  return (
    <div className="text-white min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-black text-[#22c55e]">JAMBO STOCK</h1>
        <p className="text-gray-500 text-xs mt-1 uppercase tracking-widest">All Jambo Roll Types Overview</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="bg-white/[0.03] border border-[#22c55e]/20 rounded-2xl p-4 flex items-center gap-3">
          <Package className="text-[#22c55e]" size={24}/>
          <div><p className="text-2xl font-black text-[#22c55e]">{totalRolls}</p><p className="text-[10px] text-gray-500 uppercase">Total Rolls</p></div>
        </div>
        <div className="bg-white/[0.03] border border-[#22c55e]/20 rounded-2xl p-4 flex items-center gap-3">
          <Layers className="text-[#22c55e]" size={24}/>
          <div><p className="text-2xl font-black text-[#22c55e]">{totalYards.toFixed(0)}</p><p className="text-[10px] text-gray-500 uppercase">Total Yards</p></div>
        </div>
        <div className="bg-white/[0.03] border border-yellow-500/20 rounded-2xl p-4 flex items-center gap-3">
          <AlertTriangle className="text-yellow-500" size={24}/>
          <div><p className="text-2xl font-black text-yellow-500">{lowItems}</p><p className="text-[10px] text-gray-500 uppercase">Low Stock</p></div>
        </div>
      </div>

      {/* Type cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {JAMBO_TYPES.map(({ cat, label, path }) => {
          const items      = inventory.filter(i=>(i.category===cat||i.type===cat));
          const rolls      = items.length;
          const yards      = items.reduce((s,i)=>s+(Number(i.yards)||0),0);
          const low        = items.filter(i=>Number(i.yards)<LOW).length;
          const hasLow     = low > 0;

          return (
            <NavLink key={cat} to={path}
              className={`bg-white/[0.03] rounded-2xl p-5 border transition hover:border-[#22c55e]/50 hover:bg-white/[0.05] group ${hasLow?'border-yellow-500/30':'border-[#22c55e]/20'}`}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-black text-lg">{label}</h3>
                  <p className="text-xs text-gray-500 uppercase mt-0.5">{cat}</p>
                </div>
                {hasLow && (
                  <span className="text-[10px] bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded-full font-bold border border-yellow-500/30">
                    LOW
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-black/20 rounded-xl p-3 border border-white/5">
                  <p className="text-[9px] text-gray-500 uppercase font-bold">Rolls</p>
                  <p className="text-xl font-black text-[#22c55e] mt-0.5">{rolls}</p>
                </div>
                <div className="bg-black/20 rounded-xl p-3 border border-white/5">
                  <p className="text-[9px] text-gray-500 uppercase font-bold">Yards</p>
                  <p className="text-xl font-black text-[#22c55e] mt-0.5">{yards.toFixed(0)}</p>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500 group-hover:text-[#22c55e] transition">
                <span>View Details</span>
                <ArrowRight size={14}/>
              </div>
            </NavLink>
          );
        })}
      </div>
    </div>
  );
}
