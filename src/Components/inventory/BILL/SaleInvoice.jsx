import { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Printer, Save, ChevronDown, Package } from 'lucide-react';
import { addBill, syncHSStock } from '../../../api';
import { useStock } from '../StockContext';

const BRANDS = ['JHONSON', 'TESCO', 'RACE', 'BELL'];
const CARTON_TYPES = ['Small', 'Large'];
const CARTON_SIZES = ['10', '10.5', '11', '12'];
const SIZES = ['60 MM', '48 MM', '2 Inch', '3 Inch'];

export default function SaleInvoice() {
  const { inventory, refreshInventory } = useStock();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [header, setHeader] = useState({ partyName: '', date: new Date().toISOString().split('T')[0] });
  
  const [form, setForm] = useState({
    brand: '', cartonType: '', cartonSize: '', size: '', color: '', mic: '', height: '', cartons: '', perCtn: '', rate: ''
  });

  // Auto-Fetch Logic from Inventory
  const matchedInventory = useMemo(() => {
    return inventory.find(i => 
      i.brand === form.brand && 
      i.carton_type === form.cartonType && 
      i.size === form.size
    );
  }, [form.brand, form.cartonType, form.size, inventory]);

  useEffect(() => {
    if (matchedInventory) {
      setForm(prev => ({ ...prev, perCtn: matchedInventory.per_ctn || '' }));
    }
  }, [matchedInventory]);

  const totals = useMemo(() => {
    const grandTotal = items.reduce((s, i) => s + i.lineTotal, 0);
    const totalCartons = items.reduce((s, i) => s + Number(i.cartons), 0);
    return { grandTotal, totalCartons };
  }, [items]);

  const addItem = () => {
    if (!form.brand || !form.cartons || !form.rate) return;
    const totalQty = Number(form.cartons) * Number(form.perCtn);
    const lineTotal = totalQty * Number(form.rate);
    
    setItems([...items, { ...form, totalQty, lineTotal, id: crypto.randomUUID() }]);
    setForm({ brand: '', type: '', size: '', color: '', mic: '', height: '', cartons: '', perCtn: '', rate: '' });
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await addBill({ ...header, items, ...totals });
      for (const item of items) {
        await syncHSStock(item, -1); // Decrease Inventory
      }
      alert("Invoice Saved & Stock Updated Successfully!");
      setItems([]);
      refreshInventory();
    } catch (e) { alert(e.message); }
    finally { setLoading(false); }
  };

  const openPrint = () => {
    const printWin = window.open('', '_blank');
    const html = `
      <html>
        <head>
          <style>
            @page { size: A4; margin: 10mm; }
            body { font-family: sans-serif; padding: 20px; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 20px; }
            .company-name { font-size: 32px; font-weight: 900; }
            table { width: 100%; border-collapse: collapse; margin-top: 30px; }
            th, td { border: 1px solid #000; padding: 8px; font-size: 12px; text-align: left; }
            th { background: #eee; }
            .footer { margin-top: 40px; display: flex; justify-content: space-between; }
            .total-section { float: right; width: 300px; }
            .total-row { display: flex; justify-content: space-between; padding: 5px 0; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <div><div class="company-name">HS PACKAGES</div><p>Quality Packaging Solutions</p></div>
            <div style="text-align:right"><h3>SALES INVOICE</h3><p>Date: ${header.date}</p><p>Party: ${header.partyName}</p></div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Brand</th><th>Size</th><th>Color</th><th>MIC</th><th>Height</th><th>CTN Qty</th><th>Per CTN</th><th>Total Qty</th><th>Rate</th><th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(i => `
                <tr>
                  <td>${i.brand}</td><td>${i.size}</td><td>${i.color}</td><td>${i.mic}</td><td>${i.height}</td>
                  <td>${i.cartons}</td><td>${i.perCtn}</td><td>${i.totalQty}</td><td>${i.rate}</td><td>${i.lineTotal.toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="footer">
            <div><b>Total Cartons:</b> ${totals.totalCartons}</div>
            <div class="total-section">
              <div class="total-row" style="font-size:18px; border-top: 2px solid #000"><span>Grand Total:</span> <span>Rs. ${totals.grandTotal.toLocaleString()}</span></div>
            </div>
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `;
    printWin.document.write(html);
    printWin.document.close();
  };

  return (
    <div className="min-h-screen bg-[#070707] text-white p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Actions */}
        <div className="flex justify-between items-center bg-[#0c0c0c] p-6 rounded-3xl border border-white/5">
          <h1 className="text-3xl font-black italic">HS <span className="text-emerald-500">INVOICE</span></h1>
          <div className="flex gap-4">
            <button onClick={openPrint} className="bg-white/10 px-6 py-3 rounded-xl font-bold flex items-center gap-2"><Printer size={18}/> Preview</button>
            <button onClick={handleSave} disabled={loading} className="bg-emerald-500 text-black px-8 py-3 rounded-xl font-black uppercase shadow-lg shadow-emerald-500/20"><Save size={18}/> {loading ? 'Saving...' : 'Confirm & Save'}</button>
          </div>
        </div>

        {/* Party Info */}
        <div className="grid grid-cols-2 gap-6">
          <input placeholder="Buyer Name" value={header.partyName} onChange={e => setHeader({...header, partyName: e.target.value})} className="bg-white/5 border border-white/10 p-4 rounded-2xl outline-none focus:border-emerald-500 font-bold" />
          <input type="date" value={header.date} onChange={e => setHeader({...header, date: e.target.value})} className="bg-white/5 border border-white/10 p-4 rounded-2xl outline-none" />
        </div>

        {/* Professional Form */}
        <div className="bg-[#0c0c0c] p-8 rounded-[2.5rem] border border-white/5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <select value={form.brand} onChange={e => setForm({...form, brand: e.target.value})} className="bg-black border border-white/10 p-4 rounded-xl text-sm font-bold">
                <option value="">Select Brand</option>
                {BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            <select value={form.cartonType} onChange={e => setForm({...form, cartonType: e.target.value})} className="bg-black border border-white/10 p-4 rounded-xl text-sm font-bold">
                <option value="">Carton Type</option>
                {CARTON_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={form.size} onChange={e => setForm({...form, size: e.target.value})} className="bg-black border border-white/10 p-4 rounded-xl text-sm font-bold">
                <option value="">Product Size</option>
                {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl flex items-center justify-between">
              <span className="text-[10px] uppercase font-black text-emerald-500">In Stock</span>
              <span className="font-mono font-black">{matchedInventory ? matchedInventory.cartons : '0'} CTN</span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <input placeholder="Color" value={form.color} onChange={e => setForm({...form, color: e.target.value})} className="bg-black border border-white/10 p-4 rounded-xl text-sm" />
            <input placeholder="MIC" value={form.mic} onChange={e => setForm({...form, mic: e.target.value})} className="bg-black border border-white/10 p-4 rounded-xl text-sm" />
            <input placeholder="Carton Qty" type="number" value={form.cartons} onChange={e => setForm({...form, cartons: e.target.value})} className="bg-black border border-white/10 p-4 rounded-xl text-sm font-bold" />
            <input placeholder="Rate" type="number" value={form.rate} onChange={e => setForm({...form, rate: e.target.value})} className="bg-black border border-white/10 p-4 rounded-xl text-sm font-bold" />
            <button onClick={addItem} className="bg-white text-black font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-emerald-500 transition-all">Add Row</button>
          </div>
        </div>

        {/* Invoice Table */}
        <div className="bg-[#0c0c0c] border border-white/5 rounded-[2.5rem] overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-white/5 text-[10px] font-black text-gray-500 uppercase tracking-widest">
              <tr>
                <th className="p-6">Brand/Specs</th><th className="p-6">CTN</th><th className="p-6">Total Qty</th><th className="p-6">Rate</th><th className="p-6 text-right">Line Total</th><th className="p-6"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {items.map(item => (
                <tr key={item.id} className="text-sm font-bold hover:bg-white/[0.02] transition-all">
                  <td className="p-6">{item.brand} | {item.size} | {item.color}</td>
                  <td className="p-6">{item.cartons} <small className="opacity-40">CTN</small></td>
                  <td className="p-6">{item.totalQty} <small className="opacity-40">U</small></td>
                  <td className="p-6">{item.rate}</td>
                  <td className="p-6 text-right text-emerald-500">Rs. {item.lineTotal.toLocaleString()}</td>
                  <td className="p-6 text-right"><button onClick={() => setItems(items.filter(i => i.id !== item.id))}><Trash2 size={16} className="text-red-500"/></button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-10 border-t border-white/5 bg-white/[0.01] flex justify-between items-center">
             <div className="flex gap-10">
                <div><p className="text-xs text-gray-500 uppercase font-bold">Total Cartons</p><p className="text-2xl font-black">{totals.totalCartons}</p></div>
             </div>
             <div className="text-right">
                <p className="text-xs text-gray-500 uppercase font-bold">Grand Total</p>
                <p className="text-5xl font-black text-emerald-500">Rs. {totals.grandTotal.toLocaleString()}</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
