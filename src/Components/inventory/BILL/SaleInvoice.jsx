import { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Trash2, Printer, Save, Search, ChevronDown, Package, X } from 'lucide-react';
import { addBill, syncProductStock } from '../../../api';
import { useStock } from '../StockContext';

const PARTIES = [
  'AR PACKAGES','ROSHAN TRADER','HUZAIFA TRADER','SHAMS STATIONARY','ABDUL RAUF','HAMZULLAH','ANEES STATIONARY','A ONE','ZEESHAN HYD','ABDUL BASIT','MD TRADERS','MUNEER BHAI','ANWAR BHAI','FAROOQ BHAI','GR TRADER','HAMZA SIALKOT','HASHMI TRADER','GAIN TEX INTERNATIONAL','NAQI TAQI','MEMON ELECTRIC','MOK','PAKISTAN TRADER','SABIR BROTHER 1','SABIR BROTHER 2','SHERAZ HABIB','SANAULLAH TEXTILE','SUJJAD ALI','USAMA STATIONARY','ZEESHAN HAIDRABAD','WAHEED','WALI','AL FAREED','SHOKAT','HAYAT GUL','AMIR AJ','ARSALAN HAS','GR TRADER','MUDASIR MEMON','UMAIR FISHERY','AMEER AKBAR','ISMAIL BHAI','BILAL BHAI','FARHAN NEW KARACHI','N.K ENTERPRISES'
];

// --- Searchable Dropdown Component ---
const PartySearch = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const filtered = PARTIES.filter(p => p.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="relative">
      <div onClick={() => setOpen(!open)} className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl flex justify-between items-center cursor-pointer hover:bg-white/10 transition-all">
        <span className={value ? "text-white font-bold" : "text-gray-500 font-bold"}>{value || "Select Buyer"}</span>
        <ChevronDown size={18} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </div>
      {open && (
        <div className="absolute z-50 w-full mt-2 bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
          <div className="p-3 border-b border-white/5">
            <input autoFocus placeholder="Search party..." className="w-full bg-black/40 p-2 rounded-xl text-sm outline-none" onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filtered.map(p => (
              <div key={p} className="p-4 text-sm font-bold hover:bg-emerald-500 hover:text-black cursor-pointer transition-colors" 
                onClick={() => { onChange(p); setOpen(false); setSearch(''); }}>{p}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default function SaleInvoice() {
  const { inventory, refreshInventory } = useStock();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [header, setHeader] = useState({ partyName: '', date: new Date().toISOString().split('T')[0] });
  const [form, setForm] = useState({ brand: '', type: '', size: '', color: '', mic: '', cartons: '', perCtn: '', rate: '' });

  // Live Stock logic
  const liveStock = useMemo(() => {
    const found = inventory.find(i => i.brand === form.brand && i.size === form.size);
    const available = found ? Number(found.qty) : 0;
    const remaining = available - Number(form.cartons || 0);
    return { available, remaining };
  }, [form.brand, form.size, form.cartons, inventory]);

  const totals = useMemo(() => {
    const grandTotal = items.reduce((s, i) => s + i.lineTotal, 0);
    const totalCartons = items.reduce((s, i) => s + Number(i.cartons), 0);
    return { grandTotal, totalCartons };
  }, [items]);

  const addItem = () => {
    if (!form.brand || !form.cartons || !form.rate) return;
    const qty = Number(form.cartons) * Number(form.perCtn || 1);
    setItems([...items, { ...form, qty, lineTotal: qty * Number(form.rate), id: crypto.randomUUID() }]);
    setForm({ brand: '', type: '', size: '', color: '', mic: '', cartons: '', perCtn: '', rate: '' });
  };

  const saveInvoice = async () => {
    if (!header.partyName || items.length === 0) return alert("Missing Info!");
    setLoading(true);
    try {
      await addBill({ ...header, items, ...totals });
      for (const item of items) {
        await syncProductStock(item.brand, item.size, -item.cartons);
      }
      alert("Invoice Saved Successfully!");
      setItems([]);
      refreshInventory();
    } catch (e) { alert(e.message); }
    finally { setLoading(false); }
  };

  const openPrintWindow = () => {
    const printWindow = window.open('', '_blank');
    const html = `
      <html>
        <head>
          <title>Invoice - ${header.partyName}</title>
          <style>
            @page { size: A4; margin: 15mm; }
            body { font-family: 'Inter', sans-serif; padding: 0; color: #000; }
            .header { display: flex; justify-content: space-between; margin-bottom: 40px; border-bottom: 2px solid #000; padding-bottom: 20px; }
            .logo { font-size: 28px; font-weight: 900; italic; }
            .inv-details { text-align: right; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { background: #f2f2f2; border: 1px solid #000; padding: 12px; font-size: 11px; text-transform: uppercase; }
            td { border: 1px solid #000; padding: 10px; font-size: 12px; font-weight: bold; }
            .totals-table { width: 250px; margin-left: auto; }
            .footer { margin-top: 50px; display: flex; justify-content: space-between; }
            .sig-box { border-top: 1px solid #000; width: 150px; text-align: center; font-size: 10px; padding-top: 5px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div><div class="logo">BEERFLOW</div><p>Premium Tape ERP Solutions</p></div>
            <div class="inv-details"><b>PARTY:</b> ${header.partyName}<br/><b>DATE:</b> ${header.date}</div>
          </div>
          <table>
            <thead>
              <tr><th>Description</th><th>Specs</th><th>CTN</th><th>Qty</th><th>Rate</th><th>Total</th></tr>
            </thead>
            <tbody>
              ${items.map(i => `<tr>
                <td>${i.brand} - ${i.type}</td>
                <td>${i.size} / ${i.mic} / ${i.color}</td>
                <td style="text-align:center">${i.cartons}</td>
                <td style="text-align:center">${i.qty}</td>
                <td style="text-align:right">${i.rate}</td>
                <td style="text-align:right">${i.lineTotal.toLocaleString()}</td>
              </tr>`).join('')}
            </tbody>
          </table>
          <div class="totals-table">
            <div style="display:flex; justify-content:space-between"><span><b>Total CTN:</b></span> <span>${totals.totalCartons}</span></div>
            <div style="display:flex; justify-content:space-between; font-size: 20px; margin-top:10px"><span><b>GRAND TOTAL:</b></span> <span><b>Rs. ${totals.grandTotal.toLocaleString()}</b></span></div>
          </div>
          <div class="footer">
            <div class="sig-box">Receiver Signature</div>
            <div class="sig-box">Authorized Signature</div>
          </div>
          <script>window.onload = () => { window.print(); window.close(); }</script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="min-h-screen bg-[#070707] p-8 text-white">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-4xl font-black italic text-emerald-500 uppercase">Sales Invoice</h1>
          <div className="flex gap-4">
            <button onClick={openPrintWindow} className="bg-white/5 border border-white/10 px-8 py-3 rounded-2xl flex items-center gap-2 hover:bg-white/10 font-bold"><Printer size={18}/> Preview & Print</button>
            <button onClick={saveInvoice} disabled={loading} className="bg-emerald-500 text-black px-10 py-3 rounded-2xl flex items-center gap-2 hover:scale-105 font-black uppercase"><Save size={18}/> {loading ? 'Saving...' : 'Save Invoice'}</button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <PartySearch value={header.partyName} onChange={val => setHeader({...header, partyName: val})} />
          <input type="date" value={header.date} onChange={e => setHeader({...header, date: e.target.value})} className="bg-white/5 border border-white/10 p-4 rounded-2xl outline-none font-bold" />
        </div>

        <div className="bg-white/[0.02] border border-white/5 p-8 rounded-[2.5rem]">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <input placeholder="Brand" value={form.brand} onChange={e => setForm({...form, brand: e.target.value})} className="bg-black/40 border border-white/10 p-4 rounded-xl text-sm" />
            <input placeholder="Size" value={form.size} onChange={e => setForm({...form, size: e.target.value})} className="bg-black/40 border border-white/10 p-4 rounded-xl text-sm" />
            <input placeholder="Cartons" type="number" value={form.cartons} onChange={e => setForm({...form, cartons: e.target.value})} className="bg-black/40 border border-white/10 p-4 rounded-xl text-sm" />
            <input placeholder="Rate" type="number" value={form.rate} onChange={e => setForm({...form, rate: e.target.value})} className="bg-black/40 border border-white/10 p-4 rounded-xl text-sm" />
            <div className="flex flex-col justify-center px-4 border border-emerald-500/20 rounded-xl bg-emerald-500/5 col-span-2">
              <p className="text-[10px] uppercase font-black text-emerald-500 tracking-widest">Inventory Status</p>
              <p className="text-xs font-bold">Available: {liveStock.available} | Remaining: <span className={liveStock.remaining < 0 ? 'text-red-500' : 'text-emerald-500'}>{liveStock.remaining}</span></p>
            </div>
            <button onClick={addItem} className="bg-white text-black font-black uppercase text-xs rounded-xl hover:bg-emerald-500 transition-all col-span-2">Add to Invoice</button>
          </div>

          <div className="bg-[#111] rounded-3xl overflow-hidden border border-white/5">
            <table className="w-full text-left">
              <thead className="bg-white/5">
                <tr className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                  <th className="p-6">Product</th><th className="p-6">CTN</th><th className="p-6">Total Qty</th><th className="p-6">Rate</th><th className="p-6 text-right">Line Total</th><th className="p-6"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {items.map(item => (
                  <tr key={item.id} className="text-sm font-bold">
                    <td className="p-6">{item.brand} ({item.size})</td>
                    <td className="p-6">{item.cartons}</td>
                    <td className="p-6">{item.qty}</td>
                    <td className="p-6">{item.rate}</td>
                    <td className="p-6 text-right font-black text-emerald-500">Rs. {item.lineTotal.toLocaleString()}</td>
                    <td className="p-6 text-right"><button onClick={() => setItems(items.filter(i => i.id !== item.id))}><Trash2 size={16} className="text-red-500"/></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
