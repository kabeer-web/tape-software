import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  getLedgerEntries, addLedgerEntry, updateLedgerEntry, deleteLedgerEntry 
} from "../../../api";
import { 
  Users, Plus, Trash2, Pencil, Search, Filter, Calendar, 
  ArrowUpRight, ArrowDownLeft, Wallet, ChevronLeft, 
  ChevronRight, MoreHorizontal, X, AlertCircle, CheckCircle2,
  Download, FilterX
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SALE_PARTIES = ['AR PACKAGES','ROSHAN TRADER','HUZAIFA TRADER','SHAMS STATIONARY','ABDUL RAUF','HAMZULLAH','ANEES STATIONARY','A ONE','ZEESHAN HYD','ABDUL BASIT','MD TRADERS','MUNEER BHAI','ANWAR BHAI','FAROOQ BHAI','GR TRADER','HAMZA SIALKOT','HASHMI TRADER','GAIN TEX INTERNATIONAL','NAQI TAQI','MEMON ELECTRIC','MOK PAKISTAN TRADER','SABIR BROTHER 1','SABIR BROTHER 2','SHERAZ HABIB','SANAULLAH TEXTILE','SUJJAD ALI','USAMA STATIONARY','ZEESHAN HAIDRABAD','WAHEED WALI','AL FAREED','SHOKAT HAYAT','GUL AMIR','AJ ARSALAN','HAS GR TRADER','MUDASIR MEMON','UMAIR FISHERY','AMEER AKBAR','ISMAIL BHAI','BILAL BHAI','FARHAN NEW KARACHI','N.K ENTERPRISES'];
const PURCHASE_PARTIES = ['UNIVERSAL COTTING','KOSHER','CHAWLA INDUSTRY','IBAD CORE','TAHSEEN CARTON','TALHA WASEEM','ASGHR CORE','DEER TAPE','SAMAD BHAI'];
const ALL_PARTIES = [...SALE_PARTIES.map(n => ({ name: n, type: 'Sale' })), ...PURCHASE_PARTIES.map(n => ({ name: n, type: 'Purchase' }))];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// --- REUSABLE MODAL COMPONENT ---
const Modal = ({ isOpen, onClose, title, children, footer }) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
        />
        <motion.div 
          initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="relative w-full max-w-lg bg-[#121212] border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
        >
          <div className="flex items-center justify-between p-6 border-b border-white/5">
            <h3 className="text-xl font-bold text-white">{title}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors"><X size={20} /></button>
          </div>
          <div className="p-6">{children}</div>
          {footer && <div className="flex justify-end gap-3 p-6 bg-white/[0.02] border-t border-white/5">{footer}</div>}
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

export default function Ledger() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeParty, setActiveParty] = useState(null);
  const [activeType, setActiveType] = useState('Sale');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [toast, setToast] = useState(null);

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[new Date().getMonth()]);
  const [filterType, setFilterType] = useState('All'); // All, Debit, Credit

  // Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);

  // Form States
  const [editForm, setEditForm] = useState({ date: '', description: '', amount: '', entry_type: '' });
  const [addForm, setAddForm] = useState({ entry_type: 'credit', description: '', amount: '', date: new Date().toLocaleDateString('en-GB') });

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const d = await getLedgerEntries();
      setEntries(d);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // --- CRUD LOGIC (Preserved) ---
  const handleManualEntry = async () => {
    if (!activeParty || !addForm.amount) return;
    try {
      const saved = await addLedgerEntry({ ...addForm, party_name: activeParty, party_type: activeType, amount: Number(addForm.amount) });
      setEntries([...entries, saved]);
      setShowAddForm(false);
      setAddForm({ entry_type: 'credit', description: '', amount: '', date: new Date().toLocaleDateString('en-GB') });
      showToast("Transaction added successfully!");
    } catch (e) { showToast("Failed to add transaction", "error"); }
  };

  const openEditModal = (entry) => {
    setSelectedEntry(entry);
    setEditForm({ 
        date: entry.date, 
        description: entry.description, 
        amount: entry.amount, 
        entry_type: entry.entry_type 
    });
    setIsEditModalOpen(true);
  };

  const saveEdit = async () => {
    try {
      const updated = await updateLedgerEntry(selectedEntry._id, { ...editForm, amount: Number(editForm.amount) });
      setEntries(prev => prev.map(e => e._id === selectedEntry._id ? updated : e));
      setIsEditModalOpen(false);
      showToast("Entry updated successfully!");
    } catch (e) { showToast("Update failed", "error"); }
  };

  const openDeleteModal = (entry) => {
    setSelectedEntry(entry);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    try {
      await deleteLedgerEntry(selectedEntry._id);
      setEntries(prev => prev.filter(e => e._id !== selectedEntry._id));
      setIsDeleteModalOpen(false);
      showToast("Entry deleted permanently!");
    } catch (e) { showToast("Deletion failed", "error"); }
  };

  // --- CALCULATIONS (Preserved Logic) ---
  const filteredData = useMemo(() => {
    if (!activeParty) return [];
    
    // 1. Basic Filters (Month/Year)
    let filtered = entries.filter(e => {
      const entryDate = e.date.split('/'); 
      const m = MONTHS[parseInt(entryDate[1]) - 1];
      const y = parseInt(entryDate[2]);
      const matchesSearch = e.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           (e.ref_bill_no && e.ref_bill_no.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesType = filterType === 'All' || e.entry_type === filterType.toLowerCase();
      
      return e.party_name === activeParty && m === selectedMonth && y === selectedYear && matchesSearch && matchesType;
    });

    // 2. Sorting
    filtered.sort((a,b) => {
        const da = a.date.split('/').reverse().join('');
        const db = b.date.split('/').reverse().join('');
        return da.localeCompare(db);
    });

    // 3. Running Balance
    let currentBal = 0;
    return filtered.map(e => {
      if (e.entry_type === 'debit') currentBal += Number(e.amount);
      else currentBal -= Number(e.amount);
      return { ...e, runningBalance: currentBal };
    });
  }, [entries, activeParty, selectedMonth, selectedYear, searchTerm, filterType]);

  const stats = useMemo(() => {
    const dr = filteredData.filter(e => e.entry_type === 'debit').reduce((s,e) => s + Number(e.amount), 0);
    const cr = filteredData.filter(e => e.entry_type === 'credit').reduce((s,e) => s + Number(e.amount), 0);
    return { totalDebit: dr, totalCredit: cr, balance: dr - cr };
  }, [filteredData]);

  if (loading) return (
    <div className="flex h-[80vh] items-center justify-center">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 border-4 border-[#22c55e]/20 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-[#22c55e] border-t-transparent rounded-full animate-spin"></div>
      </div>
    </div>
  );

  return (
    <div className="text-white min-h-screen flex font-sans overflow-hidden">
      
      {/* --- TOAST NOTIFICATION --- */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 20 }} exit={{ opacity: 0, y: -50 }}
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border ${
              toast.type === 'error' ? 'bg-red-500/10 border-red-500/50 text-red-400' : 'bg-[#22c55e]/10 border-[#22c55e]/50 text-[#22c55e]'
            } backdrop-blur-md`}
          >
            {toast.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
            <span className="font-bold">{toast.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- SIDEBAR: Parties --- */}
      <motion.aside 
        animate={{ width: isSidebarCollapsed ? 80 : 300 }}
        className="relative bg-[#0c0c0c] border-r border-white/5 flex flex-col transition-all duration-300"
      >
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          {!isSidebarCollapsed && <span className="font-black text-[#22c55e] tracking-tighter text-xl">ACCOUNTS</span>}
          <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
            {isSidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {!isSidebarCollapsed && (
            <>
              <div className="flex gap-2 p-1 bg-white/5 rounded-2xl">
                <button onClick={()=>setActiveType('Sale')} className={`flex-1 py-2 rounded-xl text-[10px] font-black transition-all ${activeType==='Sale' ? 'bg-[#22c55e] text-black shadow-lg shadow-[#22c55e]/20' : 'text-gray-500 hover:text-white'}`}>SALES</button>
                <button onClick={()=>setActiveType('Purchase')} className={`flex-1 py-2 rounded-xl text-[10px] font-black transition-all ${activeType==='Purchase' ? 'bg-[#22c55e] text-black shadow-lg shadow-[#22c55e]/20' : 'text-gray-500 hover:text-white'}`}>PURCHASE</button>
              </div>
              <div className="space-y-1">
                {ALL_PARTIES.filter(p => p.type === activeType).map(p => (
                  <button 
                    key={p.name} 
                    onClick={() => setActiveParty(p.name)} 
                    className={`w-full text-left p-3 rounded-xl flex items-center justify-between transition-all group ${activeParty === p.name ? 'bg-[#22c55e]/10 border border-[#22c55e]/30' : 'hover:bg-white/5 border border-transparent'}`}
                  >
                    <span className={`text-xs font-bold truncate ${activeParty === p.name ? 'text-[#22c55e]' : 'text-gray-400 group-hover:text-white'}`}>{p.name}</span>
                    {activeParty === p.name && <CheckCircle2 size={12} className="text-[#22c55e]" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </motion.aside>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#070707]">
        {!activeParty ? (
          <div className="flex-1 flex flex-col items-center justify-center opacity-30">
            <Users size={80} className="mb-4" />
            <p className="text-2xl font-black uppercase tracking-widest italic">Select Party Ledger</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col p-8 gap-8 overflow-hidden">
            
            {/* Header Section */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
              <div>
                <motion.h1 layoutId="partyName" className="text-5xl font-black text-[#22c55e] italic uppercase tracking-tighter leading-none mb-2">
                  {activeParty}
                </motion.h1>
                <div className="flex items-center gap-4 text-gray-500 text-xs font-bold tracking-widest uppercase">
                  <span className="flex items-center gap-1.5"><Wallet size={14} /> {activeType} Ledger</span>
                  <span className="flex items-center gap-1.5"><Calendar size={14} /> {selectedMonth} {selectedYear}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                  <input 
                    type="text" value={searchTerm} onChange={(e)=>setSearchTerm(e.target.value)}
                    placeholder="Search transactions..."
                    className="w-full bg-white/5 border border-white/10 p-3 pl-12 rounded-2xl outline-none focus:border-[#22c55e]/50 transition-all font-bold text-sm"
                  />
                </div>
                <button onClick={() => setShowAddForm(true)} className="bg-[#22c55e] text-black h-12 px-6 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-[#22c55e]/20 flex items-center gap-2">
                  <Plus size={18} strokeWidth={3}/> New Entry
                </button>
                <button className="bg-white/5 hover:bg-white/10 text-white h-12 px-6 rounded-2xl font-black text-xs uppercase transition-all flex items-center gap-2">
                  <Download size={16} /> Export
                </button>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-[#121212] p-6 rounded-[2rem] border border-white/5 group hover:border-red-500/20 transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-red-500/10 text-red-500 rounded-2xl"><ArrowUpRight size={24}/></div>
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Total Sales (DR)</span>
                </div>
                <p className="text-3xl font-black text-white leading-none">Rs. {stats.totalDebit.toLocaleString()}</p>
              </div>
              <div className="bg-[#121212] p-6 rounded-[2rem] border border-white/5 group hover:border-[#22c55e]/20 transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-[#22c55e]/10 text-[#22c55e] rounded-2xl"><ArrowDownLeft size={24}/></div>
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Total Payments (CR)</span>
                </div>
                <p className="text-3xl font-black text-white leading-none">Rs. {stats.totalCredit.toLocaleString()}</p>
              </div>
              <div className="bg-[#22c55e] p-6 rounded-[2rem] border border-[#22c55e]/20 shadow-xl shadow-[#22c55e]/10">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-black/10 text-black rounded-2xl"><Wallet size={24}/></div>
                  <span className="text-[10px] font-black text-black/40 uppercase tracking-widest">Current Balance</span>
                </div>
                <p className="text-3xl font-black text-black leading-none">Rs. {stats.balance.toLocaleString()}</p>
              </div>
            </div>

            {/* Advanced Filters */}
            <div className="flex flex-wrap items-center justify-between gap-4 py-4 border-y border-white/5">
              <div className="flex items-center gap-2">
                <Filter size={16} className="text-[#22c55e] mr-2" />
                <select value={selectedMonth} onChange={e=>setSelectedMonth(e.target.value)} className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-xs font-bold outline-none cursor-pointer">
                  {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <select value={selectedYear} onChange={e=>setSelectedYear(Number(e.target.value))} className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-xs font-bold outline-none cursor-pointer">
                  {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <select value={filterType} onChange={e=>setFilterType(e.target.value)} className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-xs font-bold outline-none cursor-pointer">
                  <option value="All">All Transactions</option>
                  <option value="Debit">Debit Only</option>
                  <option value="Credit">Credit Only</option>
                </select>
              </div>
              <button onClick={() => {setSearchTerm(''); setFilterType('All');}} className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-white transition-colors">
                <FilterX size={14} /> Reset Filters
              </button>
            </div>

            {/* --- LEDGER TABLE --- */}
            <div className="flex-1 min-h-0 bg-[#121212] rounded-[2rem] border border-white/5 overflow-hidden flex flex-col">
              <div className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-white/10">
                <table className="w-full text-left border-separate border-spacing-0">
                  <thead className="sticky top-0 z-10 bg-[#1a1a1a]">
                    <tr>
                      <th className="p-6 text-[10px] font-black text-gray-500 uppercase tracking-widest">Date</th>
                      <th className="p-6 text-[10px] font-black text-gray-500 uppercase tracking-widest">Transaction Details</th>
                      <th className="p-6 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">Debit (Sales)</th>
                      <th className="p-6 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">Credit (Paid)</th>
                      <th className="p-6 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">Balance</th>
                      <th className="p-6 text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredData.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-20 text-center">
                          <div className="flex flex-col items-center opacity-20">
                            <MoreHorizontal size={48} className="mb-4" />
                            <p className="text-xl font-black uppercase italic tracking-widest">No Transactions Found</p>
                            <p className="text-xs font-bold normal-case tracking-normal">Adjust search or filters</p>
                          </div>
                        </td>
                      </tr>
                    ) : filteredData.map((e, idx) => (
                      <motion.tr 
                        initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.03 }}
                        key={e._id} className="group hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="p-6">
                          <span className="bg-white/5 px-3 py-1.5 rounded-lg font-mono text-[11px] font-bold text-gray-400">{e.date}</span>
                        </td>
                        <td className="p-6">
                          <p className="font-bold text-sm text-white group-hover:text-[#22c55e] transition-colors">{e.description}</p>
                          {e.ref_bill_no && <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Ref: {e.ref_bill_no}</span>}
                          {e.bill_id && <span className="ml-2 text-[8px] bg-[#22c55e]/10 text-[#22c55e] px-1.5 py-0.5 rounded font-black border border-[#22c55e]/20 uppercase">System Generated</span>}
                        </td>
                        <td className="p-6 text-right font-black text-red-500 text-lg">
                          {e.entry_type==='debit' ? Number(e.amount).toLocaleString() : '—'}
                        </td>
                        <td className="p-6 text-right font-black text-[#22c55e] text-lg">
                          {e.entry_type==='credit' ? Number(e.amount).toLocaleString() : '—'}
                        </td>
                        <td className="p-6 text-right">
                          <span className={`px-4 py-2 rounded-2xl font-black text-lg inline-block min-w-[120px] ${e.runningBalance > 0 ? 'bg-red-500/10 text-red-400' : 'bg-[#22c55e]/10 text-[#22c55e]'}`}>
                            {Math.abs(e.runningBalance).toLocaleString()}
                            <small className="text-[10px] ml-1 opacity-60 uppercase">{e.runningBalance > 0 ? 'DR' : 'CR'}</small>
                          </span>
                        </td>
                        <td className="p-6">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => openEditModal(e)} className="p-2.5 text-blue-400 hover:bg-blue-500 hover:text-white rounded-xl transition-all"><Pencil size={16} /></button>
                            <button onClick={() => openDeleteModal(e)} className="p-2.5 text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-all"><Trash2 size={16} /></button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* --- MODAL: New Entry --- */}
      <Modal 
        isOpen={showAddForm} onClose={() => setShowAddForm(false)} 
        title="Create New Ledger Entry"
        footer={
          <>
            <button onClick={() => setShowAddForm(false)} className="px-6 py-2.5 rounded-xl font-bold text-gray-400 hover:text-white transition-colors">Cancel</button>
            <button onClick={handleManualEntry} className="px-8 py-2.5 bg-[#22c55e] text-black font-black rounded-xl hover:scale-105 transition-all">Save Transaction</button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-1">
            <label className="text-[10px] font-black text-gray-500 uppercase ml-2">Description</label>
            <input value={addForm.description} onChange={e=>setAddForm({...addForm, description: e.target.value})} className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none focus:border-[#22c55e]/50 font-bold" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-500 uppercase ml-2">Type</label>
            <select value={addForm.entry_type} onChange={e=>setAddForm({...addForm, entry_type: e.target.value})} className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none focus:border-[#22c55e]/50 font-bold">
              <option value="credit">Credit (Paid)</option>
              <option value="debit">Debit (Sale)</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-500 uppercase ml-2">Amount (Rs.)</label>
            <input type="number" value={addForm.amount} onChange={e=>setAddForm({...addForm, amount: e.target.value})} className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none focus:border-[#22c55e]/50 font-bold" />
          </div>
        </div>
      </Modal>

      {/* --- MODAL: Edit Entry --- */}
      <Modal 
        isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} 
        title="Edit Ledger Transaction"
        footer={
          <>
            <button onClick={() => setIsEditModalOpen(false)} className="px-6 py-2.5 rounded-xl font-bold text-gray-400 hover:text-white transition-colors">Cancel</button>
            <button onClick={saveEdit} className="px-8 py-2.5 bg-[#22c55e] text-black font-black rounded-xl hover:scale-105 transition-all">Update Entry</button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-1">
            <label className="text-[10px] font-black text-gray-500 uppercase ml-2">Description</label>
            <input value={editForm.description} onChange={e=>setEditForm({...editForm, description: e.target.value})} className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none focus:border-[#22c55e]/50 font-bold" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-500 uppercase ml-2">Amount</label>
            <input type="number" value={editForm.amount} onChange={e=>setEditForm({...editForm, amount: e.target.value})} className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none focus:border-[#22c55e]/50 font-bold" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-500 uppercase ml-2">Date</label>
            <input value={editForm.date} onChange={e=>setEditForm({...editForm, date: e.target.value})} className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none focus:border-[#22c55e]/50 font-bold" />
          </div>
        </div>
      </Modal>

      {/* --- MODAL: Confirm Delete --- */}
      <Modal 
        isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} 
        title="Delete Transaction?"
        footer={
          <>
            <button onClick={() => setIsDeleteModalOpen(false)} className="px-6 py-2.5 rounded-xl font-bold text-gray-400 hover:text-white transition-colors">Cancel</button>
            <button onClick={handleDelete} className="px-8 py-2.5 bg-red-600 text-white font-black rounded-xl hover:bg-red-700 transition-all">Delete Entry</button>
          </>
        }
      >
        <div className="flex items-center gap-4 text-gray-400 p-2">
          <AlertCircle size={40} className="text-red-500 shrink-0" />
          <p className="text-sm">This action cannot be undone. This entry will be permanently removed from the ledger records of <span className="text-white font-bold">{activeParty}</span>.</p>
        </div>
      </Modal>

    </div>
  );
}
