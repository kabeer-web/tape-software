import { useState, useContext, useMemo } from 'react';
import { StockContext } from './inventory/StockContext'; 
import {
  Search, Package, Archive, Layers, AlertTriangle,
  Droplet, Sun, Shirt, Shield, Wind, Zap, Sparkles, Palette, Cloud,
  RotateCcw, ChevronRight, Box, Filter, RefreshCcw
} from 'lucide-react';

const JAMBO_CATEGORIES = ['Clear', 'Tan', 'Cloth', 'Masking', 'Tissue', 'SuperYellow', 'SuperClear', 'Color', 'Foam'];
const LOW_STOCK_YARDS = 50;
const LOW_STOCK_UNITS = 20;

const categoryStyle = {
  Clear:       { icon: Droplet,  color: '#10b981', gradient: 'from-emerald-500/20 to-emerald-500/5' },
  Tan:         { icon: Sun,      color: '#f59e0b', gradient: 'from-amber-500/20 to-amber-500/5' },
  Cloth:       { icon: Shirt,    color: '#10b981', gradient: 'from-green-500/20 to-green-500/5' },
  Masking:     { icon: Shield,   color: '#3b82f6', gradient: 'from-blue-500/20 to-blue-500/5' },
  Tissue:      { icon: Wind,     color: '#8b5cf6', gradient: 'from-violet-500/20 to-violet-500/5' },
  SuperYellow: { icon: Zap,      color: '#fbbf24', gradient: 'from-yellow-400/20 to-yellow-400/5' },
  SuperClear:  { icon: Sparkles, color: '#34d399', gradient: 'from-teal-400/20 to-teal-400/5' },
  Color:       { icon: Palette,  color: '#ec4899', gradient: 'from-pink-500/20 to-pink-500/5' },
  Foam:        { icon: Cloud,    color: '#94a3b8', gradient: 'from-slate-400/20 to-slate-400/5' },
};

// Search helper function
const tokenMatch = (haystack, query) => {
  if (!query.trim()) return true;
  const tokens = query.toLowerCase().trim().split(/\s+/);
  const target = String(haystack).toLowerCase();
  return tokens.every(t => target.includes(t));
};

const MasterSearch = () => {
  const { inventory, resetInventory, refreshInventory, loading } = useContext(StockContext);
  const [activeTab, setActiveTab] = useState('Jambo');
  const [searchTerm, setSearchTerm] = useState('');
  const [jamboCategoryFilter, setJamboCategoryFilter] = useState('All');

  // 1. JAMBO FILTER LOGIC
  const filteredJambo = useMemo(() => {
    return inventory.filter(i => {
      const cat = i.category || i.type;
      const matchesCat = jamboCategoryFilter === 'All' || cat === jamboCategoryFilter;
      const rollNo = String(i.rollNo || i.roll_no || '');
      const matchesSearch = rollNo.toLowerCase().includes(searchTerm.toLowerCase());
      return JAMBO_CATEGORIES.includes(cat) && matchesCat && matchesSearch;
    });
  }, [inventory, jamboCategoryFilter, searchTerm]);

  // 2. CORE GROUPING LOGIC
  const filteredCore = useMemo(() => {
    const raw = inventory.filter(i => i.category === 'Core');
    const grouped = raw.reduce((acc, curr) => {
      const key = `${curr.brand}-${curr.side}-${curr.ply}`;
      if (!acc[key]) acc[key] = { ...curr, totalQty: 0 };
      acc[key].totalQty += Number(curr.qty || 0);
      return acc;
    }, {});
    return Object.values(grouped).filter(i => tokenMatch(`${i.brand} ${i.side} ${i.ply}`, searchTerm));
  }, [inventory, searchTerm]);

  // 3. CARTON GROUPING LOGIC
  const filteredCarton = useMemo(() => {
    const raw = inventory.filter(i => i.category === 'Carton' || i.type === 'Carton');
    const grouped = raw.reduce((acc, curr) => {
      const cType = curr.cartonType || curr.carton_type || 'Standard';
      const key = `${curr.brand}-${cType}-${curr.size}`;
      if (!acc[key]) acc[key] = { ...curr, cType, totalQty: 0 };
      acc[key].totalQty += Number(curr.qty || 0);
      return acc;
    }, {});
    return Object.values(grouped).filter(i => tokenMatch(`${i.brand} ${i.cType} ${i.size}`, searchTerm));
  }, [inventory, searchTerm]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 text-slate-200">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-white uppercase italic">
            INVENTORY <span className="text-emerald-500">HUB</span>
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-1">Live Database Tracking</p>
        </div>
        <div className="flex gap-2">
            <button onClick={refreshInventory} className="p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all text-slate-400">
                <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
            <button onClick={resetInventory} className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 px-5 py-2.5 rounded-2xl border border-red-500/20 transition-all text-sm font-bold">
                <RotateCcw size={16} /> Reset
            </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex p-1.5 bg-black/40 border border-white/5 rounded-[2rem] mb-10 max-w-sm mx-auto backdrop-blur-xl">
        {['Jambo', 'Core', 'Carton'].map(tab => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setSearchTerm(''); }}
            className={`relative flex-1 py-3 rounded-[1.6rem] text-xs font-black uppercase transition-all duration-300 ${
              activeTab === tab ? 'bg-emerald-500 text-black shadow-lg' : 'text-slate-500 hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Search Bar Area */}
      <div className="bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-4 mb-8">
        <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-emerald-500/50" size={20} />
                <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={`Quick search ${activeTab}...`}
                    className="w-full pl-16 pr-6 py-4 bg-black/20 rounded-[1.8rem] border border-white/5 focus:border-emerald-500/50 outline-none transition-all text-white placeholder:text-slate-600"
                />
            </div>
            {activeTab === 'Jambo' && (
                <div className="flex gap-2 overflow-x-auto pb-2 lg:pb-0 scrollbar-hide">
                    {['All', ...JAMBO_CATEGORIES].map(cat => (
                        <button key={cat} onClick={() => setJamboCategoryFilter(cat)} className={`px-5 py-2 rounded-2xl text-[10px] font-black uppercase whitespace-nowrap transition-all border ${jamboCategoryFilter === cat ? 'bg-emerald-500 text-black border-emerald-500 shadow-md' : 'bg-white/5 text-slate-500 border-white/5 hover:text-white'}`}>
                            {cat}
                        </button>
                    ))}
                </div>
            )}
        </div>
      </div>

      {/* Data Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {activeTab === 'Jambo' && filteredJambo.map(item => {
            const style = categoryStyle[item.category || item.type] || categoryStyle.Clear;
            const isLow = Number(item.yards) < LOW_STOCK_YARDS;
            return (
                <div key={item._id || item.id} className={`group bg-white/[0.03] border rounded-[2rem] p-6 transition-all duration-500 hover:-translate-y-2 ${isLow ? 'border-red-500/30' : 'border-white/10 hover:border-emerald-500/20'}`}>
                    <div className="flex justify-between items-start mb-6">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-black/40 border border-white/10" style={{ color: style.color }}>
                            <style.icon size={24} />
                        </div>
                        {isLow && <div className="bg-red-500/10 text-red-500 px-3 py-1 rounded-full text-[10px] font-black animate-pulse uppercase">Low</div>}
                    </div>
                    <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">{item.category || item.type}</p>
                    <h3 className="text-3xl font-black text-white group-hover:text-emerald-400 transition-colors">#{item.rollNo || item.roll_no}</h3>
                    <div className="space-y-3 pt-4 mt-4 border-t border-white/5">
                        <div className="flex justify-between text-sm"><span className="text-slate-500">Thickness</span><span className="text-slate-200">{item.micron}μ</span></div>
                        <div className="flex justify-between text-sm"><span className="text-slate-500">Available</span><span className={`font-black ${isLow ? 'text-red-400' : 'text-emerald-400'}`}>{item.yards} YDS</span></div>
                    </div>
                </div>
            )
        })}

        {(activeTab === 'Core' || activeTab === 'Carton') && (activeTab === 'Core' ? filteredCore : filteredCarton).map((i, idx) => {
             const isLow = i.totalQty < LOW_STOCK_UNITS;
             return (
                <div key={idx} className="group bg-white/[0.02] border border-white/10 rounded-3xl p-6 hover:bg-white/[0.05] transition-all">
                    <div className="flex justify-between items-center mb-4">
                        <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-500">
                            {activeTab === 'Core' ? <Package size={24} /> : <Archive size={24} />}
                        </div>
                        {isLow && <span className="bg-red-500/20 text-red-500 text-[10px] px-2 py-1 rounded-lg font-bold">LOW</span>}
                    </div>
                    <h3 className="text-xl font-bold text-white uppercase tracking-tight">{i.brand}</h3>
                    <p className="text-xs text-slate-500 font-bold mb-6 uppercase">
                        {activeTab === 'Core' ? `${i.side} • ${i.ply} Ply` : `${i.cType} • ${i.size}" Size`}
                    </p>
                    <div className="flex items-end justify-between border-t border-white/5 pt-4">
                        <div>
                            <p className="text-[10px] uppercase text-slate-600 font-black">Stock Units</p>
                            <p className={`text-3xl font-black ${isLow ? 'text-red-400' : 'text-emerald-500'}`}>{i.totalQty}</p>
                        </div>
                        <ChevronRight className="text-slate-800 group-hover:text-emerald-500 transition-all group-hover:translate-x-1" />
                    </div>
                </div>
             )
        })}
      </div>

      {/* Empty State */}
      {(!loading && (activeTab === 'Jambo' ? filteredJambo : activeTab === 'Core' ? filteredCore : filteredCarton).length === 0) && (
        <div className="flex flex-col items-center justify-center py-24 bg-white/[0.01] border border-dashed border-white/10 rounded-[3rem]">
            <Search size={48} className="text-slate-800 mb-4" />
            <h3 className="text-xl font-bold text-slate-600 uppercase">No matching stock</h3>
        </div>
      )}
    </div>
  );
};

export default MasterSearch;