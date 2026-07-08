import { useContext, useMemo, useState, useEffect } from 'react';
import { StockContext, displayRoll } from '../Components/inventory/StockContext';
import { useAccounts } from '../Components/inventory/ACCOUNTS/AccountsContext';
import { getProductions, getInventory, getBills, getLedgerEntries, addInventory, addBill, addProduction, addLedgerEntry } from '../api';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie, Legend, AreaChart, Area, CartesianGrid,
} from 'recharts';
import {
  Package, Archive, Layers, TrendingUp, TrendingDown, AlertTriangle,
  FileText, Users, Activity, ArrowUpRight, ArrowDownRight, DollarSign,
  Calendar, CheckCircle2, Clock, Factory, ShoppingCart, ReceiptText,
  Download, Upload
} from 'lucide-react';

const JAMBO_CATEGORIES = ['Clear', 'Tan', 'Cloth', 'Masking', 'Tissue', 'SuperYellow', 'SuperClear', 'Color', 'Foam', 'Lemon'];
const LOW_JAMBO = 50;
const LOW_UNITS = 20;
const todayStr = () => new Date().toLocaleDateString('en-GB'); // matches DD/MM/YYYY used across bills/inventory/production

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
      ) : trend != null ? (
        <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black ${trend >= 0 ? 'text-[#10b981] bg-[#10b981]/10' : 'text-red-500 bg-red-500/10'}`}>
          {trend >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {Math.abs(trend).toFixed(1)}%
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

const ACTIVITY_ICONS = {
  Sale: { icon: ReceiptText, color: '#10b981' },
  Purchase: { icon: ShoppingCart, color: '#3b82f6' },
  Production: { icon: Factory, color: '#f59e0b' },
};

const Dashboard = () => {
  const stockCtx = useContext(StockContext);
  const accountCtx = useAccounts();

  // Safety fallbacks: Data load hone tak crash nahi hoga
  const inventory = stockCtx?.inventory || [];
  const bills = accountCtx?.bills || [];
  const ledger = accountCtx?.ledger || [];
  const parties = accountCtx?.partiesSummary || {}; // Yahan 'parties' ki jagah summary use hogi

  // ── Export: bundles every table into one downloadable JSON file ──
  // Fetches fresh from the DB (not just whatever's currently in this
  // component's state) so the backup is always the complete, current
  // picture — not a partial snapshot if this page hadn't finished loading
  // everything yet. If offline, the service worker's cached GET responses
  // (see vite.config.js) serve the last-synced data automatically, so this
  // still works without internet — falls back to in-memory state only if
  // even that fails.
  const handleExport = async () => {
    try {
      let freshInventory, freshBills, freshProductions, freshLedger;
      try {
        [freshInventory, freshBills, freshProductions, freshLedger] = await Promise.all([
          getInventory(), getBills(), getProductions(), getLedgerEntries()
        ]);
      } catch (fetchErr) {
        console.warn('Export: fresh fetch failed, falling back to current in-memory data', fetchErr);
        freshInventory = inventory; freshBills = bills; freshProductions = productions; freshLedger = ledger;
      }

      const backup = {
        exportedAt: new Date().toISOString(),
        schemaVersion: 1,
        inventory: freshInventory || [],
        bills: freshBills || [],
        productions: freshProductions || [],
        ledger: freshLedger || [],
      };
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hs-erp-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Export failed: ' + e.message);
    }
  };

  // Runs an async worker over a list with a concurrency cap — much faster
  // than one-row-at-a-time for larger backups, while still isolating each
  // row's success/failure (one bad row never blocks the rest).
  const runWithLimit = async (items, worker, limit = 6) => {
    const results = new Array(items.length);
    let next = 0;
    const runners = new Array(Math.min(limit, items.length)).fill(0).map(async () => {
      while (next < items.length) {
        const i = next++;
        results[i] = await worker(items[i], i).catch(err => ({ error: err }));
      }
    });
    await Promise.all(runners);
    return results;
  };

  const toNum = (v, fallback = 0) => {
    const n = Number(v);
    return isNaN(n) ? fallback : n;
  };

  // ── Import: reads a backup file and re-inserts every record ──
  // Old ids are stripped (DB generates fresh ones) so this never collides
  // with existing rows. Ledger entries' bill_id is remapped to the NEWLY
  // created bill ids from this same import (old ids won't exist anymore),
  // or set to null if the referenced bill wasn't part of this import.
  const [importing, setImporting] = useState(false);
  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Import needs to know, synchronously, whether each row actually saved
    // — both for the bill-id remap and for an honest success count. If
    // offline, writes get silently queued by the service worker's
    // Background Sync instead of completing now, which would make every
    // row look like it "failed" even though it'll actually go through
    // later. Rather than report that confusing false failure, block
        // import outright until back online.
    if (!navigator.onLine) {
      alert('Import needs an active internet connection (it needs to confirm each record saved successfully as it goes). Please reconnect and try again.');
      e.target.value = '';
      return;
    }

    let data;
    try {
      const text = await file.text();
      data = JSON.parse(text);
    } catch (err) {
      alert('This file isn\'t valid JSON — export a backup from this app\'s Export button and try that file.');
      e.target.value = '';
      return;
    }

    const hasAnyKnownKey = ['inventory', 'bills', 'productions', 'ledger'].some(k => Array.isArray(data?.[k]));
    if (!data || typeof data !== 'object' || !hasAnyKnownKey) {
      alert('This doesn\'t look like a valid HS ERP backup file (expected inventory/bills/productions/ledger). Nothing was imported.');
      e.target.value = '';
      return;
    }

    const totalRows = (data.inventory?.length || 0) + (data.bills?.length || 0) + (data.productions?.length || 0) + (data.ledger?.length || 0);
    const typed = window.prompt(`This will ADD ${totalRows} record(s) from the backup file into your live database (it does not delete anything first, and importing the same file twice will duplicate everything). Type IMPORT to confirm:`);
    if (typed !== 'IMPORT') { e.target.value = ''; return; }

    setImporting(true);
    // Warn on accidental close/refresh — there's no resume, a half-finished
    // import just means "some rows made it in, some didn't."
    const beforeUnload = (ev) => { ev.preventDefault(); ev.returnValue = ''; };
    window.addEventListener('beforeunload', beforeUnload);

    const counts = { inventory: 0, bills: 0, productions: 0, ledger: 0, skipped: 0 };
    try {
      await runWithLimit(data.inventory || [], async (item) => {
        const { id, _id, created_at, ...rest } = item;
        const payload = { ...rest, qty: toNum(rest.qty), yards: toNum(rest.yards) };
        try { await addInventory(payload); counts.inventory++; }
        catch (err) { console.error('Import inventory row failed', err); counts.skipped++; }
      });

      // Bills must fully finish before ledger runs — ledger rows need the
      // real new bill ids this step produces.
      const billIdMap = {};
      await runWithLimit(data.bills || [], async (b) => {
        const oldId = b._id || b.id;
        const { id, _id, created_at, ...rest } = b;
        const payload = { ...rest, grandTotal: toNum(rest.grandTotal), totalCartonCount: toNum(rest.totalCartonCount) };
        try {
          const saved = await addBill(payload);
          if (oldId) billIdMap[oldId] = saved.id || saved._id;
          counts.bills++;
        } catch (err) { console.error('Import bill failed', err); counts.skipped++; }
      });

      await runWithLimit(data.productions || [], async (p) => {
        const { id, _id, created_at, ...rest } = p;
        const payload = { ...rest, core_qty_used: toNum(rest.core_qty_used), yards_used: toNum(rest.yards_used) };
        try { await addProduction(payload); counts.productions++; }
        catch (err) { console.error('Import production row failed', err); counts.skipped++; }
      });

      await runWithLimit(data.ledger || [], async (l) => {
        const { id, _id, created_at, ...rest } = l;
        const remapped = rest.bill_id ? (billIdMap[rest.bill_id] || null) : null;
        const payload = { ...rest, bill_id: remapped, amount: toNum(rest.amount) };
        try { await addLedgerEntry(payload); counts.ledger++; }
        catch (err) { console.error('Import ledger row failed', err); counts.skipped++; }
      });

      // Reload every context from the DB so the newly imported rows show up everywhere.
      await stockCtx?.refreshInventory?.();
      await accountCtx?.refreshAll?.();
      const freshProd = await getProductions().catch(() => productions);
      setProductions(Array.isArray(freshProd) ? freshProd : productions);

      alert(`Import complete — Inventory: ${counts.inventory}, Bills: ${counts.bills}, Productions: ${counts.productions}, Ledger: ${counts.ledger}. Skipped (errors): ${counts.skipped}.`);
    } catch (err) {
      alert('Import failed: ' + err.message);
    } finally {
      window.removeEventListener('beforeunload', beforeUnload);
      setImporting(false);
      e.target.value = '';
    }
  };

  // Production isn't in a shared context (same pattern Production.jsx itself uses:
  // fetched locally). Dashboard needs it for Today's Production + Recent Activities.
  const [productions, setProductions] = useState([]);
  const [prodLoading, setProdLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getProductions()
      .then(data => { if (!cancelled) setProductions(Array.isArray(data) ? data : []); })
      .catch(e => console.error('Dashboard: failed to load productions', e))
      .finally(() => { if (!cancelled) setProdLoading(false); });
    return () => { cancelled = true; };
  }, []);

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

    const today = todayStr();
    const todaySalesBills = bills.filter(b => b.billType === 'Sale' && b.date === today);
    const todayPurchaseBills = bills.filter(b => b.billType === 'Purchase' && b.date === today);
    const todayProductions = productions.filter(p => p.date === today);

    const totalPurchase = bills.filter(b => b.billType === 'Purchase').reduce((s, b) => s + (Number(b.grandTotal) || 0), 0);

    const monthlyTrends = monthNames.filter(m => monthlyData[m]).map(m => monthlyData[m]);
    // Real month-over-month revenue trend (no hardcoded % — derived from actual bills)
    let revenueTrend = null;
    if (monthlyTrends.length >= 2) {
      const prev = monthlyTrends[monthlyTrends.length - 2].sale;
      const curr = monthlyTrends[monthlyTrends.length - 1].sale;
      revenueTrend = prev > 0 ? ((curr - prev) / prev) * 100 : (curr > 0 ? 100 : 0);
    }

    // Recent Activities: merge bills + productions, most recent first
    const activities = [
      ...bills.map(b => ({
        kind: b.billType === 'Sale' ? 'Sale' : 'Purchase',
        title: `${b.billType} Bill #${b.billNo || '—'}`,
        detail: `${b.partyName || 'Unknown Party'} · Rs. ${Number(b.grandTotal || 0).toLocaleString()}`,
        date: b.date,
        ts: b.created_at,
      })),
      ...productions.map(p => ({
        kind: 'Production',
        title: `Production · Roll #${displayRoll(p.roll_no || p.rollNo) || '—'}`,
        detail: `${p.jambo_type || p.category || 'Jambo'} · ${Number(p.yards_used || p.yards || 0).toLocaleString()} yds`,
        date: p.date,
        ts: p.created_at,
      })),
    ]
      .filter(a => a.ts)
      .sort((a, b) => new Date(b.ts) - new Date(a.ts))
      .slice(0, 8);

    return {
      jamboYards: jambo.reduce((s, i) => s + (Number(i.yards) || 0), 0),
      coreQty: core.reduce((s, i) => s + (Number(i.qty) || 0), 0),
      cartonQty: carton.reduce((s, i) => s + (Number(i.qty) || 0), 0),
      jamboLow: jambo.filter(i => Number(i.yards) < LOW_JAMBO).length,
      coreLow: core.filter(i => Number(i.qty) < LOW_UNITS).length,
      cartonLow: carton.filter(i => Number(i.qty) < LOW_UNITS).length,
      totalRevenue: bills.filter(b => b.billType === 'Sale').reduce((s, b) => s + (Number(b.grandTotal) || 0), 0),
      totalPurchase,
      todaySalesTotal: todaySalesBills.reduce((s, b) => s + (Number(b.grandTotal) || 0), 0),
      todaySalesCount: todaySalesBills.length,
      todayPurchaseCount: todayPurchaseBills.length,
      todayProductionCount: todayProductions.length,
      revenueTrend,
      monthlyTrends,
      jamboBreakdown,
      activities,
    };
  }, [inventory, bills, productions]);

  const distData = [
    { name: 'Jambo', value: stats.jamboYards, color: '#10b981' },
    { name: 'Core', value: stats.coreQty, color: '#3b82f6' },
    { name: 'Carton', value: stats.cartonQty, color: '#f59e0b' },
  ].filter(d => d.value > 0);

  const totalLowStock = stats.jamboLow + stats.coreLow + stats.cartonLow;

  return (
    <div className="max-w-[1600px] mx-auto px-4 py-8 space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-5xl font-black tracking-tighter text-white">HS <span className="text-[#10b981] italic">ANALYTICS</span></h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 px-5 py-3 rounded-2xl text-white font-bold text-xs uppercase tracking-widest transition-colors"
          >
            <Download size={14} /> Export
          </button>
          <label className={`flex items-center gap-2 border px-5 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest cursor-pointer transition-colors ${importing ? 'bg-white/[0.03] border-white/10 text-gray-500 cursor-not-allowed' : 'bg-white/[0.03] hover:bg-white/[0.08] border-white/10 text-white'}`}>
            <Upload size={14} /> {importing ? 'Importing...' : 'Import'}
            <input type="file" accept=".json" className="hidden" disabled={importing} onChange={handleImportFile} />
          </label>
          <div className="bg-white/[0.03] border border-white/10 px-6 py-3 rounded-3xl text-white font-bold text-sm">
              {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>
      </div>

      {totalLowStock > 0 && (
        <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-3xl px-6 py-4">
          <AlertTriangle className="text-red-500 shrink-0" size={20} />
          <p className="text-sm text-red-400 font-bold">
            {totalLowStock} item{totalLowStock > 1 ? 's are' : ' is'} running low on stock — check Jambo, Core, and Carton inventory.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard icon={Layers} label="Jambo Inventory" value={stats.jamboYards} sub="Yards" color="#10b981" alert={stats.jamboLow} />
        <StatCard icon={Package} label="Core Stock" value={stats.coreQty} sub="Units" color="#3b82f6" alert={stats.coreLow} />
        <StatCard icon={Archive} label="Carton Reserves" value={stats.cartonQty} sub="Boxes" color="#f59e0b" alert={stats.cartonLow} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard icon={Factory} label="Today's Production" value={stats.todayProductionCount} sub="Runs" color="#f59e0b" />
        <StatCard icon={ReceiptText} label="Today's Sales" value={stats.todaySalesTotal} sub="PKR" color="#10b981" />
        <StatCard icon={ShoppingCart} label="Today's Purchases" value={stats.todayPurchaseCount} sub="Bills" color="#3b82f6" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard icon={DollarSign} label="Total Revenue" value={stats.totalRevenue} sub="PKR" color="#10b981" trend={stats.revenueTrend} />
        <StatCard icon={FileText} label="Total Purchases" value={stats.totalPurchase} sub="PKR" color="#8b5cf6" />
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
                <Legend />
                <Area type="monotone" dataKey="sale" name="Sales" stroke="#10b981" fill="#10b98120" strokeWidth={4} />
                <Area type="monotone" dataKey="purchase" name="Purchases" stroke="#3b82f6" fill="#3b82f620" strokeWidth={4} />
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

      <div className="bg-[#111] border border-white/5 rounded-[3rem] p-8">
        <h3 className="text-lg font-black text-white mb-6 flex items-center gap-2">
          <Activity size={18} className="text-[#10b981]" /> Recent Activity
        </h3>
        {prodLoading && accountCtx?.loading ? (
          <div className="py-10 text-center opacity-30 font-bold uppercase tracking-widest text-sm">Loading…</div>
        ) : stats.activities.length === 0 ? (
          <div className="py-10 text-center opacity-30 font-bold uppercase tracking-widest text-sm">No Recent Activity</div>
        ) : (
          <div className="space-y-3">
            {stats.activities.map((a, i) => {
              const meta = ACTIVITY_ICONS[a.kind] || ACTIVITY_ICONS.Purchase;
              const Icon = meta.icon;
              return (
                <div key={i} className="flex items-center gap-4 py-2 border-b border-white/5 last:border-0">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${meta.color}20`, border: `1px solid ${meta.color}30` }}>
                    <Icon size={16} style={{ color: meta.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{a.title}</p>
                    <p className="text-xs text-gray-500 truncate">{a.detail}</p>
                  </div>
                  <span className="text-xs text-gray-600 font-mono shrink-0">{a.date}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;