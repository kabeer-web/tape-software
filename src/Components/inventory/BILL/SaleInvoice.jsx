import { useState, useEffect, useMemo } from 'react';
import { Trash2, Printer, Save } from 'lucide-react';
import { addBill, syncHSStock } from '../../../api';
import { useStock } from '../StockContext';

const BRANDS = ['JHONSON', 'TESCO', 'RACE', 'BELL'];
const CARTON_TYPES = ['Small', 'Large'];
const SIZES = ['60 MM', '48 MM', '2 Inch', '3 Inch'];

export default function SaleInvoice() {
  const { inventory, refreshInventory } = useStock();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [header, setHeader] = useState({ partyName: '', date: new Date().toISOString().split('T')[0] });
  
  const [form, setForm] = useState({
    brand: '', cartonType: '', size: '', color: '', mic: '', height: '', cartons: '', perCtn: '', rate: ''
  });

  // Live Inventory Match
  const matchedStock = useMemo(() => {
    return inventory.find(i => 
      i.brand === form.brand && 
      i.carton_type === form.cartonType && 
      i.size === form.size
    );
  }, [form.brand, form.cartonType, form.size, inventory]);

  useEffect(() => {
    if (matchedStock) {
      setForm(prev => ({ ...prev, perCtn: matchedStock.per_ctn || matchedStock.qty_per_carton || '1' }));
    }
  }, [matchedStock]);

  const totals = useMemo(() => {
    const grandTotal = items.reduce((s, i) => s + i.lineTotal, 0);
    const totalCartons = items.reduce((s, i) => s + Number(i.cartons), 0);
    return { grandTotal, totalCartons };
  }, [items]);

  const addItem = () => {
    if (!form.brand || !form.cartons || !form.rate) return;
    const totalQty = Number(form.cartons) * Number(form.perCtn || 1);
    const lineTotal = totalQty * Number(form.rate);
    
    setItems([...items, { ...form, totalQty, lineTotal, id: crypto.randomUUID() }]);
    setForm({ brand: '', cartonType: '', size: '', color: '', mic: '', height: '', cartons: '', perCtn: '', rate: '' });
  };

  const handleSave = async () => {
    if (!header.partyName || items.length === 0) return alert("Missing Party or Items");
    setLoading(true);
    try {
      await addBill({ ...header, ...totals, items });
      for (const item of items) {
        await syncHSStock(item, -1);
      }
      alert("HS PACKAGES: Invoice Saved & Stock Updated!");
      setItems([]);
      refreshInventory();
    } catch (e) {
      alert("Error: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const openPrint = () => {
    const printWin = window.open('', '_blank');
    printWin.document.write(`
      <html>
        <head>
          <title>HS PACKAGES - Invoice</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #000; }
            .header { display: flex; justify-content: space-between; border-bottom: 3px solid #000; padding-bottom: 20px; }
            .company { font-size: 32px; font-weight: 900; }
            table { width: 100%; border-collapse: collapse; margin-top: 30px; }
            th, td { border: 1px solid #000; padding: 10px; text-align: left; font-size: 13px; }
            th { background: #f0f0f0; }
            .totals { float: right; margin-top: 30px; width: 300px; }
            .row { display: flex; justify-content: space-between; font-weight: bold; padding: 5px 0; }
          </style>
        </head>
        <body>
          <div class="header">
            <div><div class="company">HS PACKAGES</div><p>Packaging & Tape Solutions</p></div>
            <div style="text-align:right"><h3>SALES INVOICE</h3><p>Date: ${header.date}</p><p>Party: ${header.partyName}</p></div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Brand</th><th>Size</th><th>Color</th><th>MIC</th><th>CTN</th><th>Pcs/CTN</th><th>Total Qty</th><th>Rate</th><th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(i => `
                <tr>
                  <td>${i.brand}</td><td>${i.size}</td><td>${i.color}</td><td>${i.mic}</td>
                  <td>${i.cartons}</td><td>${i.perCtn}</td><td>${i.totalQty}</td><td>${i.rate}</td><td>${i.lineTotal.toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="totals">
            <div class="row"><span>Total Cartons:</span> <span>${totals.totalCartons}</span></div>
            <div class="row" style="font-size: 20px; border-top: 2px solid #000; margin-top: 10px;">
                <span>Grand Total:</span> <span>Rs. ${totals.grandTotal.toLocaleString()}</span>
            </div>
          </div>
        </body>
      </html>
    `);
    printWin.document.close();
    printWin.print();
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6 text-white">
      <header className="flex justify-between items-center bg-[#0c0c0c] p-6 rounded-3xl border border-white/5">
        <h1 className="text-3xl font-black italic tracking-tighter">HS <span className="text-emerald-500">PACKAGES</span></h1>
        <div className="flex gap-4 font-bold">
          <button onClick={openPrint} className="bg-white/10 px-6 py-3 rounded-xl flex items-center gap-2 hover:bg-white/20 transition-all"><Printer size={18}/> Print</button>
          <button onClick={handleSave} disabled={loading} className="bg-emerald-500 text-black px-8 py-3 rounded-xl uppercase tracking-widest">{loading ? 'Saving...' : 'Confirm & Save'}</button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <input placeholder="Party Name" value={header.partyName} onChange={e => setHeader({...header, partyName: e.target.value})} className="bg-white/5 border border-white/10 p-4 rounded-2xl outline-none focus:border-emerald-500 font-bold" />
        <input type="date" value={header.date} onChange={e => setHeader({...header, date: e.target.value})} className="bg-white/5 border border-white/10 p-4 rounded-2xl outline-none" />
      </div>

      <div className="bg-[#0c0c0c] p-8 rounded-[2.5rem] border border-white/5 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-bold uppercase text-xs">
          <select value={form.brand} onChange={e => setForm({...form, brand: e.target.value})} className="bg-black border border-white/10 p-4 rounded-xl">
            <option value="">Brand</option>
            {BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <select value={form.cartonType} onChange={e => setForm({...form, cartonType: e.target.value})} className="bg-black border border-white/10 p-4 rounded-xl">
            <option value="">Carton Type</option>
            {CARTON_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={form.size} onChange={e => setForm({...form, size: e.target.value})} className="bg-black border border-white/10 p-4 rounded-xl">
            <option value="">Size</option>
            {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <input placeholder="Color" value={form.color} onChange={e => setForm({...form, color: e.target.value})} className="bg-black border border-white/10 p-4 rounded-xl" />
          <input placeholder="MIC" value={form.mic} onChange={e => setForm({...form, mic: e.target.value})} className="bg-black border border-white/10 p-4 rounded-xl" />
          <input placeholder="Cartons" type="number" value={form.cartons} onChange={e => setForm({...form, cartons: e.target.value})} className="bg-black border border-white/10 p-4 rounded-xl font-bold" />
          <input placeholder="Rate" type="number" value={form.rate} onChange={e => setForm({...form, rate: e.target.value})} className="bg-black border border-white/10 p-4 rounded-xl font-bold" />
          <button onClick={addItem} className="bg-white text-black font-black uppercase rounded-xl hover:bg-emerald-500 transition-all">Add Item</button>
        </div>

        {matchedStock && (
          <div className="bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20 flex justify-between items-center">
            <span className="text-emerald-500 font-bold uppercase text-[10px] tracking-widest">Inventory Match Found</span>
            <span className="font-black text-xl">{matchedStock.cartons} CTN <small className="text-[10px] opacity-60">Available</small></span>
          </div>
        )}
      </div>

      <div className="bg-[#0c0c0c] border border-white/5 rounded-[2.5rem] overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-white/5 text-[10px] font-black text-gray-500 uppercase tracking-widest">
            <tr>
              <th className="p-6">Description</th><th className="p-6">CTN</th><th className="p-6">Total Qty</th><th className="p-6">Rate</th><th className="p-6 text-right">Total</th><th className="p-6"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {items.map(item => (
              <tr key={item.id} className="text-sm font-bold hover:bg-white/[0.02]">
                <td className="p-6">{item.brand} | {item.size} | {item.color}</td>
                <td className="p-6">{item.cartons} <small className="opacity-40 font-normal">CTN</small></td>
                <td className="p-6">{item.totalQty} <small className="opacity-40 font-normal">U</small></td>
                <td className="p-6 font-mono text-gray-400">{item.rate}</td>
                <td className="p-6 text-right text-emerald-500 font-black">Rs. {item.lineTotal.toLocaleString()}</td>
                <td className="p-6 text-right">
                  <button onClick={() => setItems(items.filter(i => i.id !== item.id))} className="text-red-500 hover:scale-110 transition-transform"><Trash2 size={16}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="p-10 border-t border-white/5 flex justify-between items-center bg-white/[0.01]">
            <p className="text-gray-500 font-bold uppercase text-xs tracking-[0.2em]">Total Cartons: <span className="text-white text-2xl ml-3 tracking-tighter">{totals.totalCartons}</span></p>
            <p className="text-emerald-500 font-black text-5xl italic tracking-tighter shadow-emerald-500/10 drop-shadow-xl">Rs. {totals.grandTotal.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}
