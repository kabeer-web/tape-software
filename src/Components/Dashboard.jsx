import { useContext } from 'react';
import { StockContext } from '../Components/inventory/StockContext';
import { useAccounts } from '../Components/inventory/ACCOUNTS/AccountsContext';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie, Legend, AreaChart, Area, CartesianGrid
} from 'recharts';
import {
  Package, Archive, Layers, TrendingUp, AlertTriangle,
  FileText, Users, Activity, ArrowUpRight, Wallet
} from 'lucide-react';

const JAMBO_CATEGORIES = ['Clear', 'Tan', 'Cloth', 'Masking', 'Tissue', 'SuperYellow', 'SuperClear', 'Color', 'Foam'];
const LOW_JAMBO = 50;
const LOW_UNITS = 20;

// --- Custom Premium Tooltip ---
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#0f172a]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl">
        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-black mb-2">{label}</p>
        {payload.map((p, i) => (
          <div key={i} className="flex items-center gap-3 py-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color || p.fill }} />
            <p className="text-sm font-bold text-white">
              {p.name}: <span className="text-emerald-400">{Number(p.value).toLocaleString()}</span>
            </p>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// --- Modern Stat Card ---
const StatCard = ({ icon: Icon, label, value, sub, color = '#10b981', alert, trend }) => (
  <div className="group relative bg-white/[0.02] hover:bg-white/[0.04] backdrop-blur-md rounded-[2rem] border border-white/5 p-6 transition-all duration-500">
    <div className="flex justify-between items-start">
      <div 
        className="w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-500"
        style={{ background: `linear-gradient(135deg, ${color}20, ${color}05)`, border: `1px solid ${color}30` }}
      >
        <Icon size={22} style={{ color }} />
      </div>
      {alert > 0 && (
        <div className="flex flex-col items-end">
            <div className="bg-red-500/10 text-red-500 text-[10px] font-black px-2 py-1 rounded-lg animate-pulse border border-red-500/20">
              {alert} LOW
            </div>
        </div>
      )}
      {trend && (
        <div className="flex items-center gap-1 text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg text-[10px] font-black">
          <ArrowUpRight size={12} /> {trend}
        </div>
      )}
    </div>
    
    <div className="mt-6">
      <p className="text-[10px] text-slate-500 uppercase font-black tracking-[0.15em]">{label}</p>
      <div className="flex items-baseline gap-1">
        <h2 className="text-3xl font-black tracking-tighter text-white mt-1">
            {typeof value === 'number' && value > 10000 ? `${(value/1000).toFixed(1)}k` : Number(value).toLocaleString()}
        </h2>
        {sub && <span className="text-[10px] text-slate-600 font-bold uppercase">{sub}</span>}
      </div>
    </div>
  </div>
);

const Dashboard = () => {
  const { inventory } = useContext(StockContext);
  const { bills, parties } = useAccounts();

  // Data Processing (Calculations)
  const jamboItems  = inventory.filter(i => JAMBO_CATEGORIES.includes(i.category || i.type));
  const coreItems   = inventory.filter(i => i.category === 'Core');
  const cartonItems = inventory.filter(i => i.category === 'Carton');

  const jamboYards  = jamboItems.reduce((s, i) => s + (Number(i.yards) || 0), 0);
  const coreQty     = coreItems.reduce((s, i) => s + (Number(i.qty) || 0), 0);
  const cartonQty   = cartonItems.reduce((s, i) => s + (Number(i.qty) || 0), 0);

  const jamboLow   = jamboItems.filter(i => Number(i.yards) < LOW_JAMBO).length;
  const coreLow    = coreItems.filter(i => Number(i.qty) < LOW_UNITS).length;
  const cartonLow  = cartonItems.filter(i => Number(i.qty) < LOW_UNITS).length;
  const totalAlerts = jamboLow + coreLow + cartonLow;

  const totalRevenue = bills.filter(b => b.billType === 'Sale').reduce((s, b) => s + (b.grandTotal || 0), 0);

  // --- Charts Data Prep ---
  const distData = [
    { name: 'Jambo', value: jamboYards, color: '#10b981' },
    { name: 'Core', value: coreQty, color: '#3b82f6' },
    { name: 'Carton', value: cartonQty, color: '#f59e0b' },
  ].filter(d => d.value > 0);

  const jamboBreakdown = JAMBO_CATEGORIES.map(cat => ({
    name: cat,
    yards: inventory.filter(i => (i.category || i.type) === cat).reduce((s, i) => s + (Number(i.yards) || 0), 0)
  })).filter(d => d.yards > 0);

  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const monthlyData = monthNames.map(m => {
    const bMonth = bills.reduce((acc, b) => {
        const mIdx = b.date ? parseInt(b.date.split('/')[1]) - 1 : -1;
        if(monthNames[mIdx] === m) {
            if(b.billType === 'Sale') acc.sale += b.grandTotal || 0;
            else acc.purchase += b.grandTotal || 0;
        }
        return acc;
    }, { month: m, sale: 0, purchase: 0 });
    return bMonth;
  }).filter(d => d.sale > 0 || d.purchase > 0);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-white">
            STOCK <span className="text-emerald-500">ANALYTICS</span>
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-1 italic">Real-time performance metrics</p>
        </div>
        
        {totalAlerts > 0 && (
          <div className="flex items-center gap-4 bg-red-500/10 border border-red-500/20 px-6 py-3 rounded-2xl animate-in fade-in slide-in-from-right-4">
            <div className="w-10 h-10 bg-red-500 text-white rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(239,68,68,0.4)]">
              <AlertTriangle size={20} />
            </div>
            <div>
              <p className="text-red-500 font-black text-sm tracking-tight">{totalAlerts} Critical Alerts</p>
              <p className="text-red-500/60 text-[10px] uppercase font-bold tracking-widest">Action Required</p>
            </div>
          </div>
        )}
      </div>

      {/* --- Stat Grid: Inventory --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
        <StatCard icon={Layers} label="Jambo Inventory" value={jamboYards} sub="Yards" color="#10b981" alert={jamboLow} />
        <StatCard icon={Package} label="Core Units" value={coreQty} sub="Pcs" color="#3b82f6" alert={coreLow} />
        <StatCard icon={Archive} label="Carton Stock" value={cartonQty} sub="Boxes" color="#f59e0b" alert={cartonLow} />
      </div>

      {/* --- Stat Grid: Business --- */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
        <StatCard icon={Wallet} label="Total Revenue" value={totalRevenue} sub="PKR" color="#10b981" trend="+12%" />
        <StatCard icon={FileText} label="Invoices" value={bills.length} sub="Bills" color="#8b5cf6" />
        <StatCard icon={Users} label="Client Base" value={Object.keys(parties).length} sub="Parties" color="#ec4899" />
      </div>

      {inventory.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 bg-white/[0.01] border border-dashed border-white/10 rounded-[3rem]">
          <Activity size={60} className="text-slate-800 mb-4" />
          <h3 className="text-xl font-bold text-slate-500">No Data Available</h3>
          <p className="text-slate-600 text-sm">Add inventory or bills to generate insights</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* 1. Stock Distribution (Donut) */}
          <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-8 backdrop-blur-sm relative overflow-hidden">
            <div className="flex justify-between items-center mb-8">
                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Asset Distribution</h3>
                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]" />
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distData}
                    dataKey="value"
                    innerRadius="65%"
                    outerRadius="90%"
                    paddingAngle={8}
                    stroke="none"
                  >
                    {distData.map((entry, i) => <Cell key={i} fill={entry.color} cornerRadius={10} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 2. Monthly Trend (Area Chart) */}
          <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-8 backdrop-blur-sm">
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 mb-8">Cash Flow Analysis</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="colorSale" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10, fontWeight: 'bold'}} dy={10} />
                  <YAxis hide />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="sale" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorSale)" name="Revenue" />
                  <Area type="monotone" dataKey="purchase" stroke="#3b82f6" strokeWidth={2} fill="transparent" strokeDasharray="5 5" name="Expense" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 3. Jambo Breakdown (Gradient Bars) */}
          <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-8 backdrop-blur-sm lg:col-span-2">
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 mb-8">Category Performance (Yards)</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={jamboBreakdown} barGap={12}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10, fontWeight: 'bold'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} />
                  <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} content={<CustomTooltip />} />
                  <Bar dataKey="yards" radius={[12, 12, 12, 12]} barSize={40}>
                    {jamboBreakdown.map((entry, index) => (
                      <Cell key={index} fill={`url(#grad${index})`} />
                    ))}
                  </Bar>
                  {/* Gradients definitions for bars */}
                  <defs>
                    {jamboBreakdown.map((_, i) => (
                      <linearGradient key={i} id={`grad${i}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#064e3b" />
                      </linearGradient>
                    ))}
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default Dashboard;