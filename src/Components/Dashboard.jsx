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
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color || p.fill }} />
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

const StatCard = ({ icon: Icon, label, value, sub, color = '#10b981', alert, trend }) => (
  <div className="relative group bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-500 rounded-[2.5rem] border border-white/5 p-6 overflow-hidden">
    <div className={`absolute -right-10 -top-10 w-32 h-32 blur-[80px] opacity-10 rounded-full`} style={{ backgroundColor: color }} />
    <div className="relative z-10 flex justify-between items-start">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: `${color}20`, border: `1px solid ${color}30` }}>
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
            {typeof value === 'number' ? value.toLocaleString() : '0'}
        </h2>
        {sub && <span className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">{sub}</span>}
      </div>
    </div>
  </div>
);

const Dashboard = () => {
  const stockCtx = useContext(StockContext);
  const accountCtx = useAccounts();

  // Safety fallbacks: Data load hone tak crash nahi hoga
  const inventory = stockCtx?.inventory || [];
  const bills = accountCtx?.bills || [];
  const parties = accountCtx?.partiesSummary || {}; // Yahan 'parties' ki jagah summary use hogi

  const stats = useMemo(() => {
    const jambo = inventory.filter(i => JAMBO_CATEGORIES.includes(i.category || i.type));
    const core = inventory.filter(i => i.category === 'Core');
    const carton = inventory.filter(i => i.category === 'Carton');

    const monthlyData = {};
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    bills.forEach(b => {
      if (!b.date || !b.date.includes('/')) return;
      const parts = b.date.split('/');
      const mIdx = parseInt(parts[1]) - 1;
      const month = monthNames[mIdx];
      if (!monthlyData[month]) monthlyData[month] = { month, sale: 0, purchase: 0 };
      if (b.billType === 'Sale') monthlyData[month].sale += Number(b.grandTotal || 0);
      else monthlyData[month].purchase += Number(b.grandTotal || 0);
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
      totalRevenue: bills.filter(b => b.billType === 'Sale').reduce((s, b) => s + (Number(b.grandTotal) || 0), 0),
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-5xl font-black tracking-tighter text-white">HS <span className="text-[#10b981] italic">ANALYTICS</span></h1>
        </div>
        <div className="bg-white/[0.03] border border-white/10 px-6 py-3 rounded-3xl text-white font-bold text-sm">
            {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard icon={Layers} label="Jambo Inventory" value={stats.jamboYards} sub="Yards" color="#10b981" alert={stats.jamboLow} />
        <StatCard icon={Package} label="Core Stock" value={stats.coreQty} sub="Units" color="#3b82f6" alert={stats.coreLow} />
        <StatCard icon={Archive} label="Carton Reserves" value={stats.cartonQty} sub="Boxes" color="#f59e0b" alert={stats.cartonLow} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard icon={DollarSign} label="Total Revenue" value={stats.totalRevenue} sub="PKR" color="#10b981" trend="+12.5%" />
        <StatCard icon={FileText} label="Processed Bills" value={bills.length} sub="Invoices" color="#8b5cf6" />
        <StatCard icon={Users} label="Client Base" value={Object.keys(parties || {}).length} sub="Parties" color="#ec4899" />
      </div>

      {inventory.length === 0 ? (
        <div className="py-20 text-center opacity-30 font-bold uppercase tracking-widest">No Data Available</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-[#111] border border-white/5 rounded-[3rem] p-8 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis dataKey="month" hide />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="sale" stroke="#10b981" fill="#10b98120" strokeWidth={4} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-[#111] border border-white/5 rounded-[3rem] p-8 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={distData} dataKey="value" innerRadius="60%" outerRadius="80%" paddingAngle={5}>
                  {distData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
