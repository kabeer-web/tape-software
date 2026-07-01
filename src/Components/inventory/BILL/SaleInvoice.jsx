import { useState, useEffect, useMemo } from 'react';
import { Trash2, Printer, Save, Search, ChevronDown } from 'lucide-react';
import { addBill, syncHSStock } from '../../../api';
import { useStock } from '../StockContext';

const BRANDS = ['JHONSON', 'TESCO', 'RACE', 'BELL'];
const CARTON_TYPES = ['Small', 'Large'];
const CARTON_SIZES = ['10', '10.5', '11', '12'];
const PRODUCT_SIZES = ['60 MM', '48 MM', '2 Inch', '3 Inch'];

export default function SaleInvoice() {
  const { inventory, refreshInventory } = useStock();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [header, setHeader] = useState({ partyName: '', date: new Date().toISOString().split('T')[0] });
  
  const [form, setForm] = useState({
    brand: '', cartonType: '', cartonSize: '', size: '', color: '', mic: '', height: '', cartons: '', perCtn: '', rate: ''
  });

  // 1. Auto-Fetch Inventory Logic
  const matchedStock = useMemo(() => {
    return inventory.find(i => 
      i.brand === form.brand && 
      i.carton_type === form.cartonType && 
      i.size === form.size
    );
  }, [form.brand, form.cartonType, form.size, inventory]);

  useEffect(() => {
    if (matchedStock) {
      // Auto fill perCtn (Pieces per carton) from DB
      setForm(prev => ({ ...prev, perCtn: matchedStock.qty_per_carton || matchedStock.per_ctn || '1' }));
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
    setForm({ brand: '', cartonType: '', cartonSize: '', size: '', color: '', mic: '', height: '', cartons: '', perCtn: '', rate: '' });
  };

  const handleSave = async () => {
    if (!header.partyName || items.length === 0) return alert("Please select Party and add Items");
    setLoading(true);
    try {
      // Create Invoice
      await addBill({ ...header, ...totals, items });
      
      // Update Stock (Loop through rows)
      for (const item of items) {
        await syncHSStock(item, -1); // -1 to deduct
      }
      
      alert("HS PACKAGES: Invoice Saved & Inventory Updated Successfully!");
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
          <title>HS PACKAGES - SALES INVOICE</title>
          <style>
            @page { size: A4; margin: 10mm; }
            body { font-family: 'Helvetica', sans-serif; padding: 20px; color: #000; }
            .header { display: flex; justify-content: space-between; border-bottom: 3px solid #000; padding-bottom: 20px; }
            .company { font-size: 36px; font-weight: 900; letter-spacing: -1px; }
            .invoice-title { text-align: right; }
            table { width: 100%; border-collapse: collapse; margin-top: 30px; }
            th, td { border: 1px solid #000; padding: 10px; font-size: 12px; text-align: left; font-weight: bold; }
            th { background: #f0f0f0; text-transform: uppercase; }
            .footer { margin-top: 50px; display: flex; justify-content: space-between; }
            .total-box { width: 250px; }
            .total-row { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #000; }
          </style>
        </head>
        <body>
          <div class="header">
            <div><div class="company">HS PACKAGES</div><p>Quality Adhesive Tapes & Packaging</p></div>
            <div class="invoice-title"><h2>SALES INVOICE</h2><p>Date: ${header.date}</p><p>Party: ${header.partyName}</p></div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Brand</th><th>Specs</th><th>Color</th><th>CTN Qty</th><th>Per CTN</th><th>Total Qty</th><th>Rate</th><th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(i => `
                <tr>
                  <td>${i.brand}</td><td>${i.size} / ${i.mic}</td><td>${i.color}</td>
                  <td>${i.cartons}</td><td>${i.perCtn}</td><td>${i.totalQty}</td><td>${i.rate}</td>
                  <td style="text-align:right">${i.lineTotal.toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="footer">
            <div><b>Total Cartons:</b> ${totals.totalCartons} CTN</div>
            <div class="total-box">
              <div class="total-row" style="font-size: 20px; border-top: 2px solid #000;">
                <span>GRAND TOTAL:</span> <span>Rs. ${totals.grandTotal.toLocaleString()}</span>
              </div>
            </div>
          </div>
          <div style="margin-top: 100px; display: flex; justify-content: space-between;">
            <div style="border-top: 1px solid #000; width: 200px; text-align: center;">Receiver Sign</div>
            <div style="border-top: 1px solid #000; width: 200px; text-align: center;">Authorized Sign</div>
          </div>
        </body>
      </html>
    `);
    printWin.document.close();
    printWin.print();
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 text-white">
      {/* Branding Header */}
      <header className="flex flex-col md:flex-row justify-between items-center bg-[#0c0c0c] p-8 rounded-[2.5rem] border border-white/5">
        <div>
          <h1 className="text-4xl font-black italic tracking-tighter">HS <span className="text-emerald-500">PACKAGES</span></h1>
          <p className="text-[10px] text-gray-500 uppercase font-bold tracking-[0.3em] mt-1">ERP - Sales Control System</p>
        </div>
        <div className="flex gap-4 mt-6 md:mt-0 font-bold">
          <button onClick={openPrint} className="bg-white/10 px-8 py-4 rounded-2xl flex items-center gap-2 hover:bg-white/20 transition-all"><Printer size={20}/> Print A4</button>
          <button onClick={handleSave} disabled={loading} className="bg-emerald-500 text-black px-10 py-4 rounded-2xl uppercase tracking-widest font-black shadow-lg shadow-emerald-500/20">
            {loading ? 'Processing...' : 'Save & Deduct'}
          </button>
        </div>
      </header>

      {/* Party Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18}/>
            <input placeholder="Enter Buyer / Party Name" value={header.partyName} onChange={e => setHeader({...header, partyName: e.target.value})} className="w-full bg-white/5 border border-white/10 p-5 pl-14 rounded-2xl outline-none focus:border-emerald-500 font-bold transition-all" />
        </div>
        <input type="date" value={header.date} onChange={e => setHeader({...header, date: e.target.value})} className="bg-white/5 border border-white/10 p-5 rounded-2xl outline-none" />
      </div>

      {/* Entry Form */}
      <div className="bg-[#0c0c0c] p-10 rounded-[3rem] border border-white/5 shadow-2xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-500 uppercase ml-2">Brand</label>
            <select value={form.brand} onChange={e => setForm({...form, brand: e.target.value})} className="w-full bg-black border border-white/10 p-4 rounded-xl font-bold">
              <option value="">Select Brand</option>
              {BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-500 uppercase ml-2">Carton Type</label>
            <select value={form.cartonType} onChange={e => setForm({...form, cartonType: e.target.value})} className="w-full bg-black border border-white/10 p-4 rounded-xl font-bold">
              <option value="">Type</option>
              {CARTON_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-500 uppercase ml-2">Product Size</label>
            <select value={form.size} onChange={e => setForm({...form, size: e.target.value})} className="w-full bg-black border border-white/10 p-4 rounded-xl font-bold">
              <option value="">Size</option>
              {PRODUCT_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex flex-col justify-end">
            <div className={`p-4 rounded-xl border flex justify-between items-center ${matchedStock ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-white/5 border-white/10'}`}>
                <span className="text-[10px] font-black uppercase text-gray-500">Live Inventory</span>
                <span className="font-black text-lg">{matchedStock ? matchedStock.cartons : '0'} CTN</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <input placeholder="Color" value={form.color} onChange={e => setForm({...form, color: e.target.value})} className="bg-black border border-white/10 p-4 rounded-xl" />
          <input placeholder="MIC" value={form.mic} onChange={e => setForm({...form, mic: e.target.value})} className="bg-black border border-white/10 p-4 rounded-xl" />
          <input placeholder="Carton Qty" type="number" value={form.cartons} onChange={e => setForm({...form, cartons: e.target.value})} className="bg-black border border-white/10 p-4 rounded-xl font-black text-xl text-emerald-500" />
          <input placeholder="Rate" type="number" value={form.rate} onChange={e => setForm({...form, rate: e.target.value})} className="bg-black border border-white/10 p-4 rounded-xl font-black text-xl" />
          <button onClick={addItem} className="bg-white text-black font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-emerald-500 transition-all">Add Line</button>
        </div>
      </div>

      {/* Invoice Table */}
      <div className="bg-[#0c0c0c] border border-white/5 rounded-[3rem] overflow-hidden shadow-3xl">
        <table className="w-full text-left">
          <thead className="bg-white/5 text-[10px] font-black text-gray-400 uppercase tracking-widest">
            <tr>
              <th className="p-8">Description</th>
              <th className="p-8">CTN Qty</th>
              <th className="p-8 text-center">Auto-Qty</th>
              <th className="p-8 text-right">Rate</th>
              <th className="p-8 text-right">Line Total</th>
              <th className="p-8"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 font-bold">
            {items.map(item => (
              <tr key={item.id} className="hover:bg-white/[0.02] group">
                <td className="p-8">
                    <p className="text-white text-lg">{item.brand} - {item.size}</p>
                    <p className="text-[10px] text-gray-500 uppercase">{item.color} | {item.mic} MIC</p>
                </td>
                <td className="p-8"><span className="bg-white/5 px-4 py-2 rounded-lg">{item.cartons} CTN</span></td>
                <td className="p-8 text-center text-gray-500">{item.totalQty} Units</td>
                <td className="p-8 text-right font-mono">{item.rate}</td>
                <td className="p-8 text-right text-emerald-500 text-xl font-black">Rs. {item.lineTotal.toLocaleString()}</td>
                <td className="p-8 text-right">
                  <button onClick={() => setItems(items.filter(i => i.id !== item.id))} className="p-3 bg-red-500/10 text-red-500 rounded-xl opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="p-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center bg-white/[0.01]">
            <div className="flex gap-12 mb-6 md:mb-0">
                <div className="text-center">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Total Cartons</p>
                    <p className="text-3xl font-black">{totals.totalCartons} <small className="text-xs opacity-40">CTN</small></p>
                </div>
            </div>
            <div className="text-right">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Net Payable Amount</p>
                <p className="text-6xl font-black text-emerald-500 italic tracking-tighter">Rs. {totals.grandTotal.toLocaleString()}</p>
            </div>
        </div>
      </div>
    </div>
  );
}
