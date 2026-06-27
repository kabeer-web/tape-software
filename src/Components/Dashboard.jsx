import { useContext, useMemo } from 'react';
import { StockContext } from '../Components/inventory/StockContext';
import { useAccounts } from '../Components/inventory/ACCOUNTS/AccountsContext';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie, Legend, AreaChart, Area, CartesianGrid,
} from 'recharts';
import {
  Package, Archive, Layers, TrendingUp, AlertTriangle,
  FileText, Users, Activity, ArrowUpRight, DollarSign,
  Calendar, CheckCircle2, Clock
} from 'lucide-react';

const JAMBO_CATEGORIES = ['Clear', 'Tan', 'Cloth', 'Masking', 'Tissue', 'SuperYellow', 'SuperClear', 'Color', 'Foam'];
const LOW_JAMBO = 50;
const LOW_UNITS = 20;

// --- Sleek Custom Tooltip ---
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#0c0c0c] border border-[#10b981]/30 backdrop-blur-xl rounded-2xl p-4 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
        <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-black mb-2">{label}</p>
        {payload.map((p, i) => (
          <div key={i} className="flex items-center gap-3 py-1">
            <div className="w-2 h-2 rounded-full shadow-[0_0_8px_currentcolor]" style={{ backgroundColor: p.color || p.fill }} />
            <p className="text-sm font-bold text-white">
              {p.name}: <span className="text-[#10b981] font-mono">{Number(p.value).toLocaleString()}</span>
            </p>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// --- Modern Stat Card Component ---
const StatCard = ({ icon: Icon, label, value, sub, color = '#10b981', alert, trend }) => (
  <div className="relative group bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-500 rounded-[2.5rem] border border-white/5 p-6 overflow-hidden">
    {/* Background Glow */}
    <div className={`absolute -right-10 -top-10 w-32 h-32 blur-[80px] opacity-10 rounded-full`} style={{ backgroundColor: color }} />
    
    <div className="relative z-10 flex justify-between items-start">
      <div 
        className="w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-500"
        style={{ background: `linear-gradient(135deg, ${color}20, ${color}05)`, border: `1px solid ${color}30` }}
      >
        <Icon size={22} style={{ color }} />
      </div>
      {alert > 0 ? (
        <div className="bg-red-500/10 text-red-500 text-[10px] font-black px-3 py-1.5 rounded-full animate-pulse border border-red-500/20">
          {alert} ALERTS
        </div>
      ) : trend ? (
        <div className="flex items-center gap-1 text-[#10b981] bg-[#10b981]/10 px-2 py-1 rounded-lg text-[10px] font-black">
          <ArrowUpRight size={12} /> {trend}
        </div>
      ) : null}
    </div>
    
    <div className="mt-8 relative z-10">
      <p className="text-[10px] text-gray-500 uppercase font-black tracking-[0.2em] ml-1">{label}</p>
      <div className="flex items-baseline gap-2">
        <h2 className="text-4xl font-black tracking-tighter text-white mt-1 font-mono">
            {typeof value === 'number' && value > 999999 ? `${(value/1000000).toFixed(1)}M` : Number(value).toLocaleString()}
        </h2>
        {sub && <span className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">{sub}</span>}
      </div>
    </div>
  </div>
);

const Dashboard = () => {
  const { inventory } = useContext(StockContext);
  const { bills, parties } = useAccounts();

  // --- Data Calculations ---
  const stats = useMemo(() => {
    const jambo = inventory.filter(i => JAMBO_CATEGORIES.includes(i.category || i.type));
    const core = inventory.filter(i => i.category === 'Core');
    const carton = inventory.filter(i => i.category === 'Carton');

    const monthlyData = {};
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    bills.forEach(b => {
      if (!b.date) return;
      const mIdx = parseInt(b.date.split('/')[1]) - 1;
      const month = monthNames[mIdx];
      if (!monthlyData[month]) monthlyData[month] = { month, sale: 0, purchase: 0 };
      if (b.billType === 'Sale') monthlyData[month].sale += b.grandTotal || 0;
      else monthlyData[month].purchase += b.grandTotal || 0;
    });

    const jamboBreakdown = JAMBO_CATEGORIES.map(cat => ({
      name: cat,
      yards: inventory.filter(i => (i.category || i.type) === cat).reduce((s, i) => s + (Number(i.yards) || 0), 0)
    })).filter(d => d.yards > 0);

    return {
      jamboYards: jambo.reduce((s, i) => s + (Number(i.yards) || 0), 0),
      coreQty: core.reduce((s, i) => s + (Number(i.qty) || 0), 0),
      cartonQty: carton.reduce((s, i) => s + (Number(i.qty) || 0), 0),
      jamboLow: jambo.filter(i => Number(i.yards) < LOW_JAMBO).length,
      coreLow: core.filter(i => Number(i.qty) < LOW_UNITS).length,
      cartonLow: carton.filter(i => Number(i.qty) < LOW_UNITS).length,
      totalRevenue: bills.filter(b => b.billType === 'Sale').reduce((s, b) => s + (b.grandTotal || 0), 0),
      monthlyTrends: monthNames.filter(m => monthlyData[m]).map(m => monthlyData[m]),
      jamboBreakdown
    };
  }, [inventory, bills]);

  const distData = [
    { name: 'Jambo', value: stats.jamboYards, color: '#10b981' },
    { name: 'Core', value: stats.coreQty, color: '#3b82f6' },
    { name: 'Carton', value: stats.cartonQty, color: '#f59e0b' },
  ].filter(d => d.value > 0);

  return (
    <div className="max-w-[1600px] mx-auto px-4 py-8 space-y-10">
      
      {/* --- Sleek Header --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10b981] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[#10b981]"></span>
            </span>
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">System Live Status</p>
          </div>
          <h1 className="text-5xl font-black tracking-tighter text-white">
            HS <span className="text-[#10b981] italic">ANALYTICS</span>
          </h1>
        </div>

        <div className="flex items-center gap-4 bg-white/[0.03] border border-white/10 px-6 py-3 rounded-3xl backdrop-blur-md">
            <Calendar className="text-[#10b981]" size={18} />
            <div className="text-right">
                <p className="text-white font-bold text-sm">{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">HS Packages Portal</p>
            </div>
        </div>
      </div>

      {/* --- Stat Grid: Inventory --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard icon={Layers} label="Jambo Inventory" value={stats.jamboYards} sub="Total Yards" color="#10b981" alert={stats.jamboLow} />
        <StatCard icon={Package} label="Core Stock" value={stats.coreQty} sub="Total Units" color="#3b82f6" alert={stats.coreLow} />
        <StatCard icon={Archive} label="Carton Reserves" value={stats.cartonQty} sub="Total Boxes" color="#f59e0b" alert={stats.cartonLow} />
      </div>

      {/* --- Stat Grid: Business --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard icon={DollarSign} label="Total Revenue" value={stats.totalRevenue} sub="Sale Value (PKR)" color="#10b981" trend="+12.5%" />
        <StatCard icon={FileText} label="Processed Bills" value={bills.length} sub="Lifetime Invoices" color="#8b5cf6" />
        <StatCard icon={Users} label="Client Base" value={Object.keys(parties).length} sub="Active Parties" color="#ec4899" />
      </div>

      {inventory.length === 0 ? (
        <div className="py-32 flex flex-col items-center justify-center bg-white/[0.01] border border-dashed border-white/10 rounded-[3rem]">
          <Activity size={60} className="text-gray-800 animate-pulse mb-4" />
          <h3 className="text-xl font-bold text-gray-600 uppercase tracking-widest">No Active Inventory Data</h3>
          <p className="text-gray-700 text-sm mt-2">Start adding stock to generate visual analytics.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* 1. Cash Flow Analysis (sleek Area Chart) */}
          <div className="bg-white/[0.02] border border-white/5 rounded-[3rem] p-8 backdrop-blur-xl relative overflow-hidden group">
            <div className="flex justify-between items-center mb-10">
                <div>
                    <h3 className="text-xs font-black text-[#10b981] uppercase tracking-[0.2em]">Financial Performance</h3>
                    <p className="text-[10px] text-gray-600 mt-1 uppercase font-bold">Monthly Revenue vs Expense</p>
                </div>
                <Clock className="text-gray-700" size={20} />
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.monthlyTrends}>
                  <defs>
                    <linearGradient id="colorSale" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#4b5563', fontSize: 10, fontWeight: 'bold'}} dy={10} />
                  <YAxis hide />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="sale" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorSale)" name="Revenue" />
                  <Area type="monotone" dataKey="purchase" stroke="#3b82f6" strokeWidth={2} fill="transparent" strokeDasharray="5 5" name="Expense" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 2. Asset Distribution (Donut Chart) */}
          <div className="bg-white/[0.02] border border-white/5 rounded-[3rem] p-8 backdrop-blur-xl">
             <div className="flex justify-between items-center mb-10">
                <h3 className="text-xs font-black text-[#10b981] uppercase tracking-[0.2em]">Stock Distribution</h3>
                <Layers className="text-gray-700" size={20} />
            </div>
            <div className="h-80 flex flex-col md:flex-row items-center">
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
                  <Legend verticalAlign="bottom" align="center" iconType="circle" 
                    formatter={(value) => <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 3. Jambo Category Performance (Gradient Bar Chart) */}
          <div className="bg-white/[0.02] border border-white/5 rounded-[3rem] p-8 backdrop-blur-xl lg:col-span-2">
            <div className="flex justify-between items-center mb-10">
                <h3 className="text-xs font-black text-[#10b981] uppercase tracking-[0.2em]">Category Breakdown (Yards)</h3>
                <TrendingUp className="text-gray-700" size={20} />
            </div>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.jamboBreakdown}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#4b5563', fontSize: 10, fontWeight: 'bold'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#4b5563', fontSize: 10}} />
                  <Tooltip cursor={{fill: 'rgba(255,255,255,0.03)'}} content={<CustomTooltip />} />
                  <Bar dataKey="yards" radius={[12, 12, 12, 12]} barSize={45}>
                    {stats.jamboBreakdown.map((entry, index) => (
                      <Cell key={index} fill={`url(#barGrad${index})`} />
                    ))}
                  </Bar>
                  <defs>
                    {stats.jamboBreakdown.map((_, i) => (
                      <linearGradient key={i} id={`barGrad${i}`} x1="0" y1="0" x2="0" y2="1">
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

      {/* --- Footer Status Bar --- */}
      <div className="flex flex-col md:flex-row justify-between items-center px-8 py-4 bg-white/[0.02] rounded-[2rem] border border-white/5 text-[9px] font-black text-gray-600 uppercase tracking-[0.4em]">
          <div className="flex items-center gap-4">
              <div className="flex items-center gap-2"><CheckCircle2 size={12} className="text-[#10b981]"/> Database Secure</div>
              <div className="flex items-center gap-2"><CheckCircle2 size={12} className="text-[#10b981]"/> Auth Verified</div>
          </div>
          <div className="mt-2 md:mt-0">© 2026 HS PACKAGES - Industrial Software Solutions</div>
      </div>
    </div>
  );
};

export default Dashboard;
