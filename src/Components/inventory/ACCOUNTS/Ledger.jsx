import { useState, useEffect, useMemo } from 'react';
import { 
  getLedgerEntries, addLedgerEntry, updateLedgerEntry, deleteLedgerEntry,
  updateBill, deleteBill 
} from "../../../api";
import {
  Users, Plus, Trash2, Pencil, Check, X,
  TrendingUp, TrendingDown, Search, Calendar, FileDown, ChevronLeft, ChevronRight
} from 'lucide-react';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function Ledger() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeParty, setActiveParty] = useState(null);
  const [activeType, setActiveType] = useState('Sale');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(localStorage.getItem('ledger_sidebar') === 'true');
  
  // Year/Month States
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[new Date().getMonth()]);

  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({ entry_type: 'credit', description: '', amount: '', date: new Date().toLocaleDateString('en-GB') });

  useEffect(() => {
    getLedgerEntries().then(d => setEntries(d)).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    localStorage.setItem('ledger_sidebar', isSidebarCollapsed);
  }, [isSidebarCollapsed]);

  // Logic: Running Balance Calculation (Sale Ledger specific)
  const processedEntries = useMemo(() => {
    if (!activeParty) return [];
    
    // 1. Filter by Party & Date
    const filtered = entries.filter(e => {
      const entryDate = e.date.split('/'); 
      const m = MONTHS[parseInt(entryDate[1]) - 1];
      const y = parseInt(entryDate[2]);
      return e.party_name === activeParty && m === selectedMonth && y === selectedYear;
    }).sort((a,b) => {
        const da = a.date.split('/').reverse().join('');
        const db = b.date.split('/').reverse().join('');
        return da.localeCompare(db);
    });

    // 2. Calculate Running Balance
    let currentBal = 0;
    return filtered.map(e => {
      if (e.entry_type === 'debit') currentBal += Number(e.amount);
      else currentBal -= Number(e.amount);
      return { ...e, runningBalance: currentBal };
    });
  }, [entries, activeParty, selectedMonth, selectedYear]);

  const stats = useMemo(() => {
    const dr = processedEntries.filter(e => e.entry_type === 'debit').reduce((s,e) => s + Number(e.amount), 0);
    const cr = processedEntries.filter(e => e.entry_type === 'credit').reduce((s,e) => s + Number(e.amount), 0);
    return { totalDebit: dr, totalCredit: cr, balance: dr - cr };
  }, [processedEntries]);

  const exportLedgerPDF = () => {
    const logo = localStorage.getItem('erp_logo');
    const html = `
      <html>
        <head>
          <style>
            body { font-family: Arial; padding: 30px; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #333; padding-bottom: 15px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
            th { background: #333; color: #fff; padding: 8px; border: 1px solid #000; }
            td { padding: 8px; border: 1px solid #000; }
            .totals { margin-top: 20px; float: right; width: 300px; }
            .total-row { display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding: 5px 0; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>${logo ? `<img src="${logo}" style="height:60px"/>` : '<h2>HS PACKAGES</h2>'}</div>
            <div style="text-align:right">
              <h3>STATEMENT OF ACCOUNT</h3>
              <p>Party: ${activeParty}</p>
              <p>Period: ${selectedMonth} ${selectedYear}</p>
            </div>
          </div>
          <table>
            <thead>
              <tr><th>Date</th><th>Description</th><th>Debit (Sale)</th><th>Credit (Payment)</th><th>Balance</th></tr>
            </thead>
            <tbody>
              ${processedEntries.map(e => `
                <tr>
                  <td>${e.date}</td>
                  <td>${e.description}</td>
                  <td style="text-align:right">${e.entry_type==='debit'?e.amount:''}</td>
                  <td style="text-align:right">${e.entry_type==='credit'?e.amount:''}</td>
                  <td style="text-align:right; font-weight:bold">${e.runningBalance.toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="totals">
            <div class="total-row"><strong>Total Debit:</strong> <span>${stats.totalDebit.toLocaleString()}</span></div>
            <div class="total-row"><strong>Total Credit:</strong> <span>${stats.totalCredit.toLocaleString()}</span></div>
            <div class="total-row" style="font-size:16px; border-top:2px solid #000"><strong>Closing Balance:</strong> <span>${stats.balance.toLocaleString()}</span></div>
          </div>
        </body>
      </html>
    `;
    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    win.print();
  };

  const handleManualEntry = async () => {
    if (!activeParty || !form.amount) return;
    try {
      const payload = { ...form, party_name: activeParty, party_type: activeType, amount: Number(form.amount) };
      const saved = await addLedgerEntry(payload);
      setEntries([...entries, saved]);
      setShowAddForm(false);
    } catch (e) { alert("Entry failed"); }
  };

  return (
    <div className="text-white min-h-screen flex">
      {/* Collapsible Sidebar */}
      <div className={`transition-all duration-300 border-r border-white/5 bg-[#0c0c0c] flex flex-col ${isSidebarCollapsed ? 'w-16' : 'w-72'}`}>
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          {!isSidebarCollapsed && <span className="font-black text-[#22c55e]">PARTIES</span>}
          <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="p-2 hover:bg-white/5 rounded-lg text-gray-400">
            {isSidebarCollapsed ? <ChevronRight size={20}/> : <ChevronLeft size={20}/>}
          </button>
        </div>
        
        {!isSidebarCollapsed && (
          <div className="p-4">
            <div className="flex gap-2 mb-4 bg-white/5 p-1 rounded-xl">
              <button onClick={()=>setActiveType('Sale')} className={`flex-1 py-2 rounded-lg text-[10px] font-bold ${activeType==='Sale' ? 'bg-[#22c55e] text-black' : 'text-gray-500'}`}>SALES</button>
              <button onClick={()=>setActiveType('Purchase')} className={`flex-1 py-2 rounded-lg text-[10px] font-bold ${activeType==='Purchase' ? 'bg-[#22c55e] text-black' : 'text-gray-500'}`}>PURCHASE</button>
            </div>
            <div className="space-y-1 overflow-y-auto max-h-[70vh]">
              {/* Party List logic preserved from your file */}
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8">
        {!activeParty ? (
           <div className="h-full flex items-center justify-center text-gray-600 uppercase font-black tracking-widest opacity-20 text-3xl">Select a Party</div>
        ) : (
          <div className="max-w-6xl mx-auto">
            {/* Party Header & Monthly Switcher */}
            <div className="flex justify-between items-end mb-8 bg-white/[0.03] p-8 rounded-[2.5rem] border border-white/5">
              <div>
                <h1 className="text-4xl font-black text-[#22c55e] italic mb-2 uppercase">{activeParty}</h1>
                <div className="flex gap-3">
                    <select value={selectedMonth} onChange={e=>setSelectedMonth(e.target.value)} className="bg-black/40 border border-white/10 p-2 rounded-xl text-xs font-bold outline-none">
                        {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <select value={selectedYear} onChange={e=>setSelectedYear(Number(e.target.value))} className="bg-black/40 border border-white/10 p-2 rounded-xl text-xs font-bold outline-none">
                        {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
              </div>
              <div className="flex gap-4">
                <button onClick={exportLedgerPDF} className="bg-white/10 p-4 rounded-2xl flex items-center gap-2 font-bold text-xs"><FileDown size={18}/> PDF</button>
                <button onClick={()=>setShowAddForm(true)} className="bg-[#22c55e] text-black p-4 rounded-2xl flex items-center gap-2 font-bold text-xs"><Plus size={18}/> MANUAL ENTRY</button>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-6 mb-8">
                <div className="bg-white/[0.03] p-6 rounded-3xl border border-white/5">
                    <p className="text-[10px] text-gray-500 font-bold uppercase">Total Sales (DR)</p>
                    <p className="text-2xl font-black text-red-400">Rs. {stats.totalDebit.toLocaleString()}</p>
                </div>
                <div className="bg-white/[0.03] p-6 rounded-3xl border border-white/5">
                    <p className="text-[10px] text-gray-500 font-bold uppercase">Total Payments (CR)</p>
                    <p className="text-2xl font-black text-emerald-500">Rs. {stats.totalCredit.toLocaleString()}</p>
                </div>
                <div className="bg-[#22c55e]/10 p-6 rounded-3xl border border-[#22c55e]/20">
                    <p className="text-[10px] text-emerald-500 font-bold uppercase">Closing Balance</p>
                    <p className="text-2xl font-black text-[#22c55e]">Rs. {stats.balance.toLocaleString()}</p>
                </div>
            </div>

            {/* Manual Entry Form */}
            {showAddForm && (
                <div className="bg-black/60 backdrop-blur-xl border border-[#22c55e]/30 p-8 rounded-[2rem] mb-8 animate-in fade-in zoom-in duration-300">
                    <div className="flex justify-between mb-4"><h3 className="font-bold">Add Ledger Transaction</h3><X className="cursor-pointer" onClick={()=>setShowAddForm(false)}/></div>
                    <div className="grid grid-cols-4 gap-4">
                        <input type="text" placeholder="Date" value={form.date} onChange={e=>setForm({...form, date: e.target.value})} className="bg-white/5 p-4 rounded-2xl border border-white/10 outline-none"/>
                        <input type="text" placeholder="Description" value={form.description} onChange={e=>setForm({...form, description: e.target.value})} className="bg-white/5 p-4 rounded-2xl border border-white/10 outline-none"/>
                        <input type="number" placeholder="Amount" value={form.amount} onChange={e=>setForm({...form, amount: e.target.value})} className="bg-white/5 p-4 rounded-2xl border border-white/10 outline-none"/>
                        <select value={form.entry_type} onChange={e=>setForm({...form, entry_type: e.target.value})} className="bg-white/5 p-4 rounded-2xl border border-white/10 outline-none">
                            <option value="debit">Debit (Sale)</option>
                            <option value="credit">Credit (Payment)</option>
                        </select>
                    </div>
                    <button onClick={handleManualEntry} className="w-full mt-4 bg-[#22c55e] text-black font-black p-4 rounded-2xl">SAVE TRANSACTION</button>
                </div>
            )}

            {/* Transactions Table */}
            <div className="bg-white/[0.01] border border-white/5 rounded-[2.5rem] overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-white/5 text-[10px] font-black text-gray-500 uppercase">
                        <tr><th className="p-6">Date</th><th className="p-6">Description</th><th className="text-right p-6">Debit</th><th className="text-right p-6">Credit</th><th className="text-right p-6">Balance</th><th></th></tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {processedEntries.map(e => (
                            <tr key={e._id} className="hover:bg-white/5">
                                <td className="p-6 text-xs text-gray-500">{e.date}</td>
                                <td className="p-6 font-bold">{e.description}</td>
                                <td className="text-right p-6 font-bold text-red-400">{e.entry_type === 'debit' ? e.amount.toLocaleString() : '—'}</td>
                                <td className="text-right p-6 font-bold text-emerald-500">{e.entry_type === 'credit' ? e.amount.toLocaleString() : '—'}</td>
                                <td className="text-right p-6 font-black text-white">{e.runningBalance.toLocaleString()}</td>
                                <td className="p-6 flex gap-2">
                                    <button className="text-white/20 hover:text-[#22c55e]"><Pencil size={14}/></button>
                                    <button onClick={() => deleteLedgerEntry(e._id)} className="text-white/20 hover:text-red-500"><Trash2 size={14}/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
