import { useState, useContext } from 'react';
import { StockContext } from "./StockContext";
import { Search, Layers, Package, AlertTriangle } from 'lucide-react';

const LOW_STOCK_THRESHOLD = 20;
// Carton sizes now come live from StockContext.cartonSizeOptions (managed in Sidebar).

const CartonStock = () => {
  const { inventory, cartonSizeOptions } = useContext(StockContext);

  const [cartonSearch, setCartonSearch] = useState('');
  const [filterBrand, setFilterBrand] = useState('All');
  const [filterType, setFilterType] = useState('All');
  const [filterSize, setFilterSize] = useState('All');

  const cartonRaw = inventory.filter(i => i.category === 'Carton');

  // Brand + Type + Size ke hisaab se group karo
  const cartonGrouped = cartonRaw.reduce((acc, curr) => {
    const key = `${curr.brand}-${curr.type}-${curr.size}`;
    if (!acc[key]) acc[key] = { ...curr, totalQty: 0 };
    acc[key].totalQty += Number(curr.qty || 0);
    if (!acc[key].date || new Date(curr.date) > new Date(acc[key].date)) {
      acc[key].date = curr.date;
    }
    return acc;
  }, {});

  const allBrands = [...new Set(cartonRaw.map(i => i.brand))];

  const filteredCartons = Object.values(cartonGrouped).filter(i => {
    const matchesDropdowns =
      (filterBrand === 'All' || i.brand === filterBrand) &&
      (filterType === 'All' || i.type === filterType) &&
      (filterSize === 'All' || String(i.size) === filterSize);

    if (!matchesDropdowns) return false;
    if (cartonSearch.trim() === '') return true;

    const haystack = `${i.brand} ${i.type} ${i.size}`.toLowerCase();
    const tokens = cartonSearch.toLowerCase().trim().split(/\s+/);
    return tokens.every(token => haystack.includes(token));
  });

  const totalCartonQty = filteredCartons.reduce((sum, i) => sum + i.totalQty, 0);
  const totalCombinations = filteredCartons.length;

  return (
    <div className="p-8 bg-[#070707] text-white min-h-screen">
      <h1 className="text-3xl font-black mb-8">CARTON <span className="text-[#22c55e]">STOCK</span></h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white/[0.03] backdrop-blur-xl border border-[#22c55e]/20 rounded-2xl p-5 flex items-center gap-4">
          <Package className="text-[#22c55e]" size={28} />
          <div>
            <p className="text-2xl font-black text-[#22c55e]">{totalCartonQty}</p>
            <p className="text-xs text-gray-500 uppercase">Total Cartons</p>
          </div>
        </div>
        <div className="bg-white/[0.03] backdrop-blur-xl border border-[#22c55e]/20 rounded-2xl p-5 flex items-center gap-4">
          <Layers className="text-[#22c55e]" size={28} />
          <div>
            <p className="text-2xl font-black text-[#22c55e]">{totalCombinations}</p>
            <p className="text-xs text-gray-500 uppercase">Combinations</p>
          </div>
        </div>
        <div className="bg-white/[0.03] backdrop-blur-xl border border-[#22c55e]/20 rounded-2xl p-5 flex items-center gap-4 col-span-2 md:col-span-1">
          <AlertTriangle className="text-yellow-500" size={28} />
          <div>
            <p className="text-2xl font-black text-yellow-500">
              {filteredCartons.filter(i => i.totalQty < LOW_STOCK_THRESHOLD).length}
            </p>
            <p className="text-xs text-gray-500 uppercase">Low Stock Alerts</p>
          </div>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="bg-white/[0.03] backdrop-blur-xl p-5 rounded-2xl border border-[#22c55e]/10 mb-6">
        <div className="relative mb-4">
          <Search className="absolute left-4 top-3.5 text-gray-500" size={18} />
          <input
            value={cartonSearch}
            onChange={(e) => setCartonSearch(e.target.value)}
            placeholder='Search e.g. "bell large" or "race 11"'
            className="w-full pl-11 p-3 bg-black/30 rounded-xl border border-[#22c55e]/20 outline-none focus:border-[#22c55e]/50 transition"
          />
        </div>

        <div className="flex flex-wrap gap-3 mb-4">
          <select value={filterBrand} onChange={(e) => setFilterBrand(e.target.value)} className="bg-black/30 p-3 rounded-xl border border-[#22c55e]/20">
            <option value="All">All Brands</option>
            {allBrands.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <select value={filterSize} onChange={(e) => setFilterSize(e.target.value)} className="bg-black/30 p-3 rounded-xl border border-[#22c55e]/20">
            <option value="All">All Sizes</option>
            {cartonSizeOptions.map(s => <option key={s} value={s}>{s}"</option>)}
          </select>
        </div>

        <div>
          <p className="text-[11px] text-gray-500 uppercase font-bold mb-2">Type</p>
          <div className="flex gap-2">
            {['All', 'Small', 'Large'].map(t => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-4 py-2 rounded-xl text-sm font-bold border transition ${
                  filterType === t
                    ? 'bg-[#22c55e] text-black border-[#22c55e]'
                    : 'bg-black/30 text-gray-400 border-[#22c55e]/20 hover:border-[#22c55e]/50'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Result Cards */}
      {filteredCartons.length === 0 ? (
        <p className="text-gray-500 text-center py-10">No carton stock matches your search.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCartons.map((i, idx) => {
            const isLow = i.totalQty < LOW_STOCK_THRESHOLD;
            return (
              <div
                key={idx}
                className={`bg-white/[0.03] backdrop-blur-xl rounded-2xl p-5 border ${isLow ? 'border-red-500/40' : 'border-[#22c55e]/20'}`}
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-black text-lg">{i.brand}</h3>
                  {isLow && <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-1 rounded-full font-bold">LOW STOCK</span>}
                </div>
                <p className="text-sm text-gray-400 font-mono mb-3">{i.type} &middot; {i.size}" size</p>
                <p className={`text-3xl font-black ${isLow ? 'text-red-400' : 'text-[#22c55e]'}`}>{i.totalQty}</p>
                <p className="text-xs text-gray-500 mt-1">Cartons in stock</p>
                {i.date && <p className="text-[11px] text-gray-600 mt-3">Last updated: {i.date}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CartonStock;
