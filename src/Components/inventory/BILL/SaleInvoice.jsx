import { useState, useRef, useContext, useEffect, useMemo } from 'react';
import { 
  Plus, Trash2, Printer, Upload, X, CheckCircle2, Box, Database, Search, AlertTriangle 
} from 'lucide-react';
import { useAccounts } from '../ACCOUNTS/AccountsContext';
import { StockContext } from '../StockContext';

// --- Numbers to Words Logic (Wahi purana) ---
const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
function numToWords(n) {
  if (n === 0) return 'zero';
  if (n < 20) return ones[n];
  if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
  if (n < 1000) return ones[Math.floor(n / 100)] + ' hundred' + (n % 100 ? ' ' + numToWords(n % 100) : '');
  if (n < 100000) return numToWords(Math.floor(n / 1000)) + ' thousand' + (n % 1000 ? ' ' + numToWords(n % 1000) : '');
  return numToWords(Math.floor(n / 100000)) + ' lac' + (n % 100000 ? ' ' + numToWords(n % 100000) : '');
}
const toWords = (n) => {
  const r = Math.round(n);
  if (!r) return 'Zero Rupees Only';
  return numToWords(r).charAt(0).toUpperCase() + numToWords(r).slice(1) + ' Rupees Only';
};

// Constants
const ADDR = 'PLOT #356-5, SECTOR 5-B, SAEEDABAD BALDIA TOWN S.I.T.E KARACHI';
const PHONE = 'Phone: 0313-2400511 & 0308-7058453';
const BRANDS = ['Tesco', 'Bell', 'Race', 'Jhonson', 'HS Packages', 'Local', 'Imported'];
const CARTON_SIZES = ['10', '10.5', '11', '12'];

const SaleInvoice = () => {
  const { saveBill } = useAccounts();
  const { inventory, updateStock, refreshInventory } = useContext(StockContext);

  const [billNo, setBillNo] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [date, setDate] = useState(new Date().toLocaleDateString('en-GB'));
  const [rows, setRows] = useState([]);
  const [logo, setLogo] = useState(null);
  const [popMsg, setPopMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  // --- Form State ---
  const [form, setForm] = useState({
    brand: '',
    type: 'Small',
    size: '10',
    yards: '',
    colour: 'Clear',
    totalCarton: '',
    perCtnQty: '',
    rate: '',
    sizeUnit: 'mm',
    sizeMm: '',
    sizeInch: ''
  });

  // ─── 1. LIVE STOCK CHECKER (Jaise Jambo mein tha) ───
  const matchedStock = useMemo(() => {
    if (!form.brand || !form.size) return null;
    return inventory.find(i => 
      i.category === 'Carton' && 
      i.brand === form.brand && 
      String(i.size) === String(form.size) &&
      (i.carton_type || i.type) === form.type
    );
  }, [form.brand, form.size, form.type, inventory]);

  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // ─── 2. ADD TO LIST ───
  const addItem = () => {
    if (!form.totalCarton || !form.rate || !form.brand) {
        alert("Pehle details bharain!");
        return;
    }

    const tc = parseFloat(form.totalCarton);
    const pc = parseFloat(form.perCtnQty || 0);
    const sizeLabel = [
        form.sizeUnit === 'mm' ? `${form.sizeMm}mm` : `${form.sizeInch}"`,
        form.yards ? `${form.yards}yds` : ''
    ].filter(Boolean).join(' / ');

    const newRow = {
      id: Date.now(),
      ...form,
      inventoryId: matchedStock?.id || matchedStock?._id, // Save ID for auto-minus
      sizeLabel,
      totalQty: tc * pc,
      total: (tc * pc) * parseFloat(form.rate),
      cartonQty: tc
    };

    setRows(p => [...p, newRow]);
    // Form reset but keep brand/type for next entry
    setForm(p => ({ ...p, totalCarton: '', yards: '', rate: '' }));
  };

  // ─── 3. SAVE & AUTO MINUS (The Main Magic) ───
  const handleSave = async () => {
    if (!billNo || !buyerName || rows.length === 0) {
        alert("Invoice empty hai!");
        return;
    }
    setSaving(true);
    try {
      // Step A: Save Bill to Database
      const billData = {
        billType: 'Sale',
        billNo,
        partyName: buyerName,
        date,
        items: rows,
        grandTotal: rows.reduce((s, r) => s + r.total, 0),
        totalCartonCount: rows.reduce((s, r) => s + Number(r.totalCarton), 0),
        logo
      };
      await saveBill(billData);

      // Step B: Auto-Minus from Inventory
      // Har row ke liye loop chalega aur inventory update hogi
      for (const row of rows) {
        if (row.inventoryId) {
          await updateStock(row.inventoryId, -Number(row.cartonQty));
        }
      }

      setPopMsg(`✅ Bill #${billNo} saved & Inventory Updated!`);
      setTimeout(() => setPopMsg(''), 5000);
      
      // Cleanup
      setRows([]); 
      setBillNo(''); 
      setBuyerName('');
      refreshInventory(); // Stock Refresh
    } catch (err) {
      alert("Error saving bill: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const grandTotal = rows.reduce((s, r) => s + r.total, 0);
  const totalCartonCount = rows.reduce((s, r) => s + (Number(r.totalCarton) || 0), 0);

  return (
    <div className="text-white min-h-screen pb-10 max-w-6xl mx-auto px-4 font-sans">
      
      {/* Toast Notification */}
      {popMsg && (
        <div className="fixed top-10 right-10 z-50 bg-emerald-500 text-black p-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce">
           <CheckCircle2 size={20}/> <span className="font-bold">{popMsg}</span>
        </div>
      )}

      {/* Header Section */}
      <div className="flex justify-between items-center mb-8 pt-8">
        <div>
          <h1 className="text-4xl font-black italic text-emerald-500 tracking-tighter">HS <span className="text-white">PACKAGES</span></h1>
          <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em]">Smart Billing & Inventory</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleSave} 
            disabled={saving || rows.length === 0} 
            className="bg-emerald-500/10 border border-emerald-500/40 text-emerald-500 px-8 py-3 rounded-2xl font-black text-xs hover:bg-emerald-500 hover:text-black transition-all disabled:opacity-30"
          >
            {saving ? 'SYNCING...' : 'SAVE & DEDUCT'}
          </button>
        </div>
      </div>

      {/* Party & Bill Info */}
      <div className="bg-white/[0.02] border border-white/10 p-6 rounded-[2rem] mb-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-1">
            <label className="text-[10px] text-gray-500 uppercase font-black ml-2">Customer Name</label>
            <input value={buyerName} onChange={e=>setBuyerName(e.target.value)} placeholder="Enter Party Name" className="w-full bg-black/40 p-4 rounded-2xl border border-white/5 outline-none focus:border-emerald-500 font-bold" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-gray-500 uppercase font-black ml-2">Invoice Number</label>
            <input value={billNo} onChange={e=>setBillNo(e.target.value)} placeholder="Bill #" className="w-full bg-black/40 p-4 rounded-2xl border border-white/5 outline-none focus:border-emerald-500 font-bold" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-gray-500 uppercase font-black ml-2">Date</label>
            <input value={date} onChange={e=>setDate(e.target.value)} className="w-full bg-black/40 p-4 rounded-2xl border border-white/5 outline-none font-bold text-gray-400" />
          </div>
      </div>

      {/* Main Form & Live Stock UI */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        
        {/* Left: Input Form */}
        <div className="lg:col-span-2 bg-white/[0.02] border border-white/10 p-8 rounded-[2.5rem] space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-500"><Database size={20}/></div>
            <h2 className="font-black uppercase tracking-tight">Product Entry</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] text-gray-500 font-black uppercase ml-1">Brand</label>
              <select value={form.brand} onChange={e=>upd('brand', e.target.value)} className="w-full bg-black/40 p-3.5 rounded-xl border border-white/10 outline-none focus:border-emerald-500 font-bold">
                <option value="">Select Brand</option>
                {BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-gray-500 font-black uppercase ml-1">Carton Type</label>
              <select value={form.type} onChange={e=>upd('type', e.target.value)} className="w-full bg-black/40 p-3.5 rounded-xl border border-white/10 outline-none focus:border-emerald-500 font-bold">
                <option value="Small">Small</option>
                <option value="Large">Large</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-gray-500 font-black uppercase ml-1">Size (Inch)</label>
              <select value={form.size} onChange={e=>upd('size', e.target.value)} className="w-full bg-black/40 p-3.5 rounded-xl border border-white/10 outline-none focus:border-emerald-500 font-bold">
                {CARTON_SIZES.map(s => <option key={s} value={s}>{s}"</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <input type="number" placeholder="Total CTN" value={form.totalCarton} onChange={e=>upd('totalCarton', e.target.value)} className="bg-black/40 p-4 rounded-xl border border-white/10 outline-none focus:border-emerald-500 font-bold" />
            <input type="number" placeholder="Rate" value={form.rate} onChange={e=>upd('rate', e.target.value)} className="bg-black/40 p-4 rounded-xl border border-white/10 outline-none focus:border-emerald-500 font-bold" />
            <input type="number" placeholder="P/CTN Qty" value={form.perCtnQty} onChange={e=>upd('perCtnQty', e.target.value)} className="bg-black/40 p-4 rounded-xl border border-white/10 outline-none focus:border-emerald-500 font-bold" />
            <button onClick={addItem} className="bg-emerald-500 text-black font-black rounded-xl hover:scale-105 transition-all text-xs uppercase tracking-widest">Add Item</button>
          </div>
        </div>

        {/* Right: Live Stock Display */}
        <div className={`p-8 rounded-[2.5rem] border-2 transition-all duration-500 flex flex-col justify-center items-center text-center ${matchedStock ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/10'}`}>
           <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4">Inventory Status</p>
           {matchedStock ? (
             <>
               <div className="text-5xl font-black text-emerald-500 mb-2">{matchedStock.qty}</div>
               <p className="text-xs font-bold text-gray-400 uppercase">Cartons Available</p>
               <div className="mt-4 px-4 py-1 bg-emerald-500/20 text-emerald-500 rounded-full text-[10px] font-black uppercase">Stock Linked ✓</div>
             </>
           ) : (
             <>
               <AlertTriangle size={40} className="text-red-500 mb-4 opacity-50"/>
               <p className="text-sm font-bold text-red-400 uppercase">Stock Not Found</p>
               <p className="text-[10px] text-gray-600 mt-1">Check Brand/Size in Inventory</p>
             </>
           )}
        </div>
      </div>

      {/* Invoice Table */}
      <div className="bg-white/[0.02] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl">
        <table className="w-full text-left">
          <thead className="bg-white/5 text-[10px] font-black text-gray-500 uppercase tracking-widest">
            <tr>
              <th className="p-6">Description</th>
              <th className="text-center">CTN</th>
              <th className="text-center">Total Rolls</th>
              <th className="text-right">Rate</th>
              <th className="text-right p-6">Total Amount</th>
              <th className="p-6"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 font-bold">
            {rows.map(r => (
              <tr key={r.id} className="hover:bg-white/5 transition-all">
                <td className="p-6">
                  <p className="text-white uppercase">{r.brand} - {r.type} ({r.size}")</p>
                  <p className="text-[10px] text-emerald-500 mt-1">ID Linked: {r.inventoryId || 'None'}</p>
                </td>
                <td className="text-center text-xl text-white">{r.totalCarton}</td>
                <td className="text-center text-gray-400">{r.totalQty} <small className="text-[8px]">PCS</small></td>
                <td className="text-right text-gray-400">Rs {Number(r.rate).toLocaleString()}</td>
                <td className="text-right p-6 text-xl text-emerald-500 font-black">Rs {r.total.toLocaleString()}</td>
                <td className="p-6 text-right">
                  <button onClick={()=>setRows(rows.filter(x=>x.id!==r.id))} className="text-red-500/30 hover:text-red-500 p-2 transition-all"><Trash2 size={18}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary Footer */}
      <div className="mt-8 flex flex-col md:flex-row justify-between items-center gap-6 bg-white/[0.02] p-8 rounded-[3rem] border border-white/5">
        <div>
           <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Total in Words</p>
           <p className="text-sm font-black text-gray-400 italic">"{toWords(grandTotal)}"</p>
        </div>
        <div className="flex gap-10 items-center">
            <div className="text-right">
               <p className="text-[10px] font-black text-gray-500 uppercase">Cartons</p>
               <p className="text-2xl font-black text-white">{totalCartonCount}</p>
            </div>
            <div className="text-right">
               <p className="text-[10px] font-black text-gray-500 uppercase">Grand Total</p>
               <p className="text-5xl font-black text-emerald-500 tracking-tighter">Rs {grandTotal.toLocaleString()}</p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default SaleInvoice;
