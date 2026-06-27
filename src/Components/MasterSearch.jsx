import { useState, useContext, useMemo } from 'react';
import { StockContext } from './inventory/StockContext'; 
import {
  Search, Package, Archive, Layers, AlertTriangle,
  Droplet, Sun, Shirt, Shield, Wind, Zap, Sparkles, Palette, Cloud,
  RotateCcw, ChevronRight, Box, Filter, RefreshCcw, Database,
  ArrowUpRight, BarChart3
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

// --- Modern Stat Card Component ---
const HubStat = ({ icon: Icon, value, label, color }) => (
  <div className="relative overflow-hidden group bg-white/[0.02] border border-white/5 rounded-[2rem] p-5 transition-all hover:bg-white/[0.04]">
    <div className="absolute -right-4 -top-4 opacity-[0.03] group-hover:opacity-10 transition-opacity">
        <Icon size={80} />
    </div>
    <div className="relative z-10">
      <div className="w-10 h-10 rounded-2xl flex items-center justify-center mb-3" style={{ background: `${color}15`, color }}>
        <Icon size={20} />
      </div>
      <p className="text-2xl font-black tracking-tight text-white font-mono">{value.toLocaleString()}</p>
      <p className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-bold mt-1">{label}</p>
    </div>
  </div>
);

const MasterSearch = () => {
  const { inventory, resetInventory, refreshInventory, loading } = useContext(StockContext);
  const [activeTab, setActiveTab] = useState('Jambo');
  const [searchTerm, setSearchTerm] = useState('');
  const [jamboCategoryFilter, setJamboCategoryFilter] = useState('All');

  // 1. JAMBO FILTER LOGIC
  const filteredJambo = useMemo(() => {
    return inventory.filter(i => {
      const cat = i.category || i.type;
      if (!JAMBO_CATEGORIES.includes(cat)) return false;
      const matchesCat = jamboCategoryFilter === 'All' || cat === jamboCategoryFilter;
      const rollNo = String(i.roll_no || i.rollNo || '');
      const matchesSearch = rollNo.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCat && matchesSearch;
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
    <div className="max-w-7xl mx-auto px-4 py-8">
      
      {/* Header Section */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div className="relative">
          <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-1 h-12 bg-[#10b981] rounded-full blur-sm" />
          <h1 className="text-4xl font-black tracking-tighter text-white uppercase italic">
            INVENTORY <span className="text-[#10b981]">HUB</span>
          </h1>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mt-1">Global Stock Control Center</p>
        </div>
        
        <div className="flex items-center gap-3">
            <button onClick={refreshInventory} className="group p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all">
                <RefreshCcw size={18} className={`text-slate-400 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button 
              onClick={() => { if(window.confirm('Delete All Data?')) resetInventory(); }} 
              className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 px-6 py-3 rounded-2xl border border-red-500/20 transition-all text-xs font-black uppercase tracking-widest"
            >
                <RotateCcw size={14} /> Wipe DB
            </button>
        </div>
      </header>

      {/* Modern Tab Navigator */}
      <div className="flex p-1.5 bg-white/[0.02] border border-white/5 rounded-[2.5rem] mb-10 max-w-md mx-auto backdrop-blur-xl shadow-2xl">
        {['Jambo', 'Core', 'Carton'].map(tab => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setSearchTerm(''); }}
            className={`relative flex-1 py-4 rounded-[2.2rem] text-xs font-black uppercase tracking-widest transition-all duration-500 ${
              activeTab === tab ? 'text-black z-10' : 'text-slate-500 hover:text-white'
            }`}
          >
            {activeTab === tab && (
              <div className="absolute inset-0 bg-[#10b981] rounded-[2.2rem] shadow-[0_0_25px_rgba(16,185,129,0.3)] animate-in fade-in zoom-in duration-300" />
            )}
            <span className="relative z-20">{tab}</span>
          </button>
        ))}
      </div>

      {/* Live Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {activeTab === 'Jambo' ? (
          <>
            <HubStat icon={Layers} value={filteredJambo.length} label="Total Rolls" color="#10b981" />
            <HubStat icon={AlertTriangle} value={filteredJambo.filter(i => Number(i.yards) < LOW_STOCK_YARDS).length} label="Low Stock" color="#f59e0b" />
            <HubStat icon={BarChart3} value={filteredJambo.reduce((s,i)=> s + Number(i.yards || 0), 0)} label="Net Yards" color="#3b82f6" />
            <HubStat icon={Box} value={new Set(filteredJambo.map(i => i.category || i.type)).size} label="Categories" color="#8b5cf6" />
          </>
        ) : (
          <>
            <HubStat icon={Package} value={(activeTab === 'Core' ? filteredCore : filteredCarton).reduce((s,i)=>s+i.totalQty,0)} label="Total Units" color="#10b981" />
            <HubStat icon={AlertTriangle} value={(activeTab === 'Core' ? filteredCore : filteredCarton).filter(i => i.totalQty < LOW_STOCK_UNITS).length} label="Critically Low" color="#ef4444" />
            <HubStat icon={Filter} value={(activeTab === 'Core' ? filteredCore : filteredCarton).length} label="Unique Specs" color="#3b82f6" />
            <HubStat icon={Archive} value={[...new Set((activeTab === 'Core' ? filteredCore : filteredCarton).map(i=>i.brand))].length} label="Active Brands" color="#f59e0b" />
          </>
        )}
      </div>

      {/* Unified Search & Category Bar */}
      <div className="bg-white/[0.03] border border-white/5 rounded-[3rem] p-5 mb-10 backdrop-blur-sm">
        <div className="flex flex-col lg:flex-row gap-5">
            <div className="relative flex-1">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-[#10b981]/50" size={22} />
                <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={`Global search ${activeTab} database...`}
                    className="w-full pl-16 pr-6 py-5 bg-black/40 rounded-[2rem] border border-white/5 focus:border-[#10b981]/50 outline-none transition-all text-white font-bold placeholder:text-slate-600"
                />
            </div>
            {activeTab === 'Jambo' && (
                <div className="flex gap-2 overflow-x-auto pb-2 lg:pb-0 scrollbar-hide px-2">
                    {['All', ...JAMBO_CATEGORIES].map(cat => (
                        <button 
                          key={cat} 
                          onClick={() => setJamboCategoryFilter(cat)} 
                          className={`px-6 py-2 rounded-2xl text-[10px] font-black uppercase whitespace-nowrap transition-all border ${jamboCategoryFilter === cat ? 'bg-[#10b981] text-black border-[#10b981] shadow-lg shadow-emerald-500/20' : 'bg-white/5 text-slate-500 border-white/5 hover:border-[#10b981]/30'}`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            )}
        </div>
      </div>

      {/* Result Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        
        {/* JAMBO CARDS */}
        {activeTab === 'Jambo' && filteredJambo.map(item => {
            const cat = item.category || item.type;
            const style = categoryStyle[cat] || categoryStyle.Clear;
            const isLow = Number(item.yards) < LOW_STOCK_YARDS;
            return (
                <div key={item._id || item.id} className={`group relative bg-white/[0.02] border rounded-[2.5rem] p-7 transition-all duration-500 hover:-translate-y-2 hover:border-[#10b981]/30 hover:shadow-[0_20px_50px_rgba(16,185,129,0.05)] ${isLow ? 'border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.05)]' : 'border-white/5'}`}>
                    <div className="flex justify-between items-start mb-6">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-black/40 border border-white/10 text-[#10b981] shadow-inner" style={{ color: style.color }}>
                            <style.icon size={28} />
                        </div>
                        {isLow && (
                            <div className="flex items-center gap-1.5 bg-red-500/10 text-red-500 px-3 py-1.5 rounded-full text-[9px] font-black animate-pulse border border-red-500/20">
                                <AlertTriangle size={12}/> RESTOCK
                            </div>
                        )}
                    </div>
                    <p className="text-[#10b981] text-[10px] font-black uppercase tracking-[0.2em] mb-1">{cat}</p>
                    <h3 className="text-3xl font-black text-white group-hover:text-[#10b981] transition-colors tracking-tighter">#{item.rollNo || item.roll_no}</h3>
                    
                    <div className="space-y-4 pt-5 mt-5 border-t border-white/5">
                        <div className="flex justify-between items-center text-[11px] font-bold uppercase tracking-widest text-slate-500">
                            <span>Specs</span>
                            <span className="text-slate-300 font-mono">{item.micron}μ • {item.width}mm</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-black text-slate-600 uppercase italic">Stock</span>
                            <span className={`text-2xl font-black font-mono ${isLow ? 'text-red-400' : 'text-emerald-400'}`}>
                                {item.yards} <small className="text-[10px] opacity-40 uppercase">yds</small>
                            </span>
                        </div>
                    </div>
                </div>
            )
        })}

        {/* CORE / CARTON CARDS */}
        {(activeTab === 'Core' || activeTab === 'Carton') && (activeTab === 'Core' ? filteredCore : filteredCarton).map((i, idx) => {
             const isLow = i.totalQty < LOW_STOCK_UNITS;
             return (
                <div key={idx} className="group bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-8 hover:bg-white/[0.04] transition-all duration-500 border-b-2 hover:border-[#10b981]/40">
                    <div className="flex justify-between items-center mb-8">
                        <div className="p-4 bg-black/40 rounded-2xl text-[#10b981] border border-white/5 shadow-xl">
                            {activeTab === 'Core' ? <Package size={26} /> : <Archive size={26} />}
                        </div>
                        <ArrowUpRight className="text-slate-800 group-hover:text-[#10b981] transition-colors" />
                    </div>
                    
                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter group-hover:text-[#10b981] transition-colors">{i.brand}</h3>
                    <p className="text-xs text-slate-500 font-bold mb-8 uppercase tracking-widest">
                        {activeTab === 'Core' ? `${i.side} • ${i.ply} Ply` : `${i.cType} • ${i.size}" Size`}
                    </p>
                    
                    <div className="flex items-end justify-between pt-6 border-t border-white/5">
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase font-black text-slate-600 tracking-[0.1em]">Available Units</span>
                            <span className={`text-4xl font-black font-mono leading-none mt-2 ${isLow ? 'text-red-500' : 'text-[#10b981]'}`}>{i.totalQty}</span>
                        </div>
                        {isLow && <span className="bg-red-500 text-white text-[8px] px-2 py-1 rounded font-black uppercase mb-1 shadow-lg shadow-red-500/20">Low</span>}
                    </div>
                </div>
             )
        })}
      </div>

      {/* Empty State UI */}
      {(!loading && (activeTab === 'Jambo' ? filteredJambo : activeTab === 'Core' ? filteredCore : filteredCarton).length === 0) && (
        <div className="flex flex-col items-center justify-center py-40 bg-white/[0.01] border border-dashed border-white/5 rounded-[4rem] animate-in fade-in duration-700">
            <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6 text-slate-800">
                <Database size={48} strokeWidth={1} />
            </div>
            <h3 className="text-2xl font-black text-slate-700 uppercase tracking-tighter">Database Entry Not Found</h3>
            <p className="text-slate-800 text-sm font-bold mt-2 uppercase tracking-widest italic">Check filters or add new stock</p>
        </div>
      )}
    </div>
  );
};

export default MasterSearch;
