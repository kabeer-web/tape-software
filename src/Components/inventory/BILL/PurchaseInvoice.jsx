import { useState, useContext, useRef, useEffect } from 'react';
import { StockContext } from '../StockContext';
import { useAccounts } from '../ACCOUNTS/AccountsContext';
import { getLedgerEntries } from '../../../api';
import {
  Plus, Trash2, Save, FileText, Archive,
  Printer, CheckCircle2, AlertCircle
} from 'lucide-react';

const PURCHASE_PARTIES = ['UNIVERSAL COTTING','KOSHER','CHAWLA INDUSTRY','IBAD CORE','TAHSEEN CARTON','TALHA WASEEM','ASGHR CORE','DEER TAPE','SAMAD BHAI'];
const JAMBO_CATEGORIES = ['Clear','Tan','Cloth','Masking','Tissue','SuperYellow','SuperClear','Color','Foam'];
const CARTON_SIZES = ['10', '10.5', '11', '12'];
const PLY_OPTIONS = ['5', '6', '8', '10'];
const BRANDS = ['Tesco','Bell','Race','Jhonson','Local','Imported'];

const ones = ['','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
const tens  = ['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
function numToWords(n) {
  if (n===0) return 'zero';
  if (n<20) return ones[n];
  if (n<100) return tens[Math.floor(n/10)]+(n%10?' '+ones[n%10]:'');
  if (n<1000) return ones[Math.floor(n/100)]+' hundred'+(n%100?' '+numToWords(n%100):'');
  if (n<100000) return numToWords(Math.floor(n/1000))+' thousand'+(n%1000?' '+numToWords(n%1000):'');
  if (n<10000000) return numToWords(Math.floor(n/100000))+' lac'+(n%100000?' '+numToWords(n%100000):'');
  return numToWords(Math.floor(n/10000000))+' crore'+(n%10000000?' '+numToWords(n%10000000):'');
}
const toWords = (n) => {
  const r = Math.round(n);
  if (!r) return 'Zero Rupees Only';
  const w = numToWords(r);
  return w[0].toUpperCase() + w.slice(1) + ' Rupees Only';
};

const generatePurchasePrintHTML = (bill) => {
  const { billNo, partyName, date, items, grandTotal, chalanNo } = bill;
  const rowsHtml = items.map((r, i) => `
    <tr>
      <td style="text-align:center">${i + 1}</td>
      <td><b>${r.mainCategory}</b></td>
      <td>${r.specsLabel}</td>
      <td style="text-align:center">${r.qty}</td>
      <td style="text-align:right">${r.rate.toLocaleString()}</td>
      <td style="text-align:right;font-weight:bold">${r.amount.toLocaleString()}</td>
    </tr>`).join('');

  return `<html><head><title>Purchase #${billNo}</title><style>body{font-family:sans-serif;padding:40px}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border:1px solid #ddd;padding:10px;text-align:left}th{background:#f4f4f4}.total{font-size:18px;font-weight:bold;margin-top:20px;text-align:right}</style></head><body><h1>Purchase Invoice</h1><p>Supplier: ${partyName}<br>Bill No: ${billNo}<br>Date: ${date}</p><table><thead><tr><th>#</th><th>Category</th><th>Specs</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody>${rowsHtml}</tbody></table><div class="total">Grand Total: Rs. ${grandTotal.toLocaleString()}</div><p><i>"${toWords(grandTotal)}"</i></p><script>window.print();window.onafterprint=()=>window.close()</script></body></html>`;
};

const emptyForm = { mainCategory: 'Core', brand:'', side:'', ply:'', cartonType:'', size:'', jamboCategory:'', color:'', micron:'', width:'', qty:'', rate:'' };

const PurchaseInvoice = () => {
  const { addRoll } = useContext(StockContext);
  const { saveBill } = useAccounts();
  const [billNo, setBillNo] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [chalanNo, setChalanNo] = useState('');
  const [date, setDate] = useState(new Date().toLocaleDateString('en-GB'));
  const [form, setForm] = useState(emptyForm);
  const [rows, setRows] = useState([]);
  const [msg, setMsg] = useState({ text: '', ok: true });
  const [saving, setSaving] = useState(false);

  const addItem = () => {
    const qty = parseFloat(form.qty);
    const rate = parseFloat(form.rate);
    if (!qty || !rate) return;
    const label = form.mainCategory === 'Core' ? `${form.brand} | ${form.side} | ${form.ply} Ply` : form.mainCategory === 'Carton' ? `${form.brand} | ${form.cartonType} | ${form.size}"` : `${form.jamboCategory} ${form.micron}μ ${form.width}mm`;
    setRows(p => [...p, { id: Date.now(), ...form, qty, rate, amount: qty * rate, specsLabel: label }]);
    setForm({ ...emptyForm, mainCategory: form.mainCategory });
  };

  const handleSaveBill = async () => {
    if (!supplierName || rows.length === 0) return;
    setSaving(true);
    try {
      for (const r of rows) {
        let p = { category: r.mainCategory, brand: r.brand, qty: r.qty };
        if (r.mainCategory === 'Core') p = { ...p, side: r.side, ply: r.ply };
        if (r.mainCategory === 'Carton') p = { ...p, carton_type: r.cartonType, size: r.size };
        if (r.mainCategory === 'Jambo') p = { category: r.jamboCategory, micron: r.micron, width: r.width, yards: r.qty, color: r.color };
        await addRoll(p);
      }
      await saveBill({ billType: 'Purchase', billNo, partyName: supplierName.toUpperCase(), date, items: rows, grandTotal: rows.reduce((s, r) => s + r.amount, 0), chalanNo });
      setRows([]); setBillNo(''); setSupplierName('');
      setMsg({ text: '✅ Purchase Saved!', ok: true });
    } catch (err) { setMsg({ text: '❌ Error: ' + err.message, ok: false }); }
    finally { setSaving(false); setTimeout(() => setMsg({ text: '', ok: true }), 5000); }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 text-slate-200">
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-4xl font-black italic"><Archive className="inline text-emerald-500 mr-2" /> PURCHASE</h1>
        <div className="flex gap-3">
          <button onClick={handleSaveBill} disabled={rows.length === 0 || saving} className="bg-emerald-500 text-black px-6 py-2 rounded-xl font-bold uppercase text-xs">Save Bill</button>
          <button onClick={() => { const html = generatePurchasePrintHTML({ billNo, partyName: supplierName, date, items: rows, grandTotal: rows.reduce((s, r) => s + r.amount, 0), chalanNo }); const w = window.open('', '_blank'); w.document.write(html); w.document.close(); }} disabled={rows.length === 0} className="bg-white/10 px-6 py-2 rounded-xl font-bold uppercase text-xs">Print</button>
        </div>
      </div>

      {msg.text && <div className={`p-4 rounded-xl mb-6 font-bold ${msg.ok ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>{msg.text}</div>}

      <div className="bg-white/5 p-8 rounded-3xl grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <input list="s-list" value={supplierName} onChange={e=>setSupplierName(e.target.value)} placeholder="Supplier Name" className="bg-black/40 p-4 rounded-xl border border-white/10 outline-none focus:border-emerald-500" />
        <datalist id="s-list">{PURCHASE_PARTIES.map(p=><option key={p} value={p}/>)}</datalist>
        <input value={billNo} onChange={e=>setBillNo(e.target.value)} placeholder="Bill #" className="bg-black/40 p-4 rounded-xl border border-white/10 outline-none" />
        <input value={chalanNo} onChange={e=>setChalanNo(e.target.value)} placeholder="Chalan #" className="bg-black/40 p-4 rounded-xl border border-white/10 outline-none" />
        <input value={date} onChange={e=>setDate(e.target.value)} className="bg-black/40 p-4 rounded-xl border border-white/10 outline-none" />
      </div>

      <div className="bg-white/5 p-8 rounded-3xl mb-6">
        <div className="flex gap-2 mb-6">
          {['Core','Carton','Jambo'].map(cat => (
            <button key={cat} onClick={()=>setForm({...emptyForm, mainCategory: cat})} className={`px-8 py-2 rounded-xl font-bold ${form.mainCategory===cat?'bg-emerald-500 text-black':'bg-black/40 text-gray-500'}`}>{cat}</button>
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 items-end">
          {form.mainCategory === 'Core' && (
            <><select value={form.brand} onChange={e=>setForm({...form, brand:e.target.value})} className="bg-black/40 p-3 rounded-xl border border-white/10">{BRANDS.map(b=><option key={b} value={b}>{b}</option>)}</select><select value={form.side} onChange={e=>setForm({...form, side:e.target.value})} className="bg-black/40 p-3 rounded-xl border border-white/10"><option value="">Side</option><option value="Single">Single</option><option value="Double">Double</option></select><select value={form.ply} onChange={e=>setForm({...form, ply:e.target.value})} className="bg-black/40 p-3 rounded-xl border border-white/10">{PLY_OPTIONS.map(p=><option key={p} value={p}>{p} Ply</option>)}</select></>
          )}
          {form.mainCategory === 'Carton' && (
            <><select value={form.brand} onChange={e=>setForm({...form, brand:e.target.value})} className="bg-black/40 p-3 rounded-xl border border-white/10">{BRANDS.map(b=><option key={b} value={b}>{b}</option>)}</select><select value={form.cartonType} onChange={e=>setForm({...form, cartonType:e.target.value})} className="bg-black/40 p-3 rounded-xl border border-white/10"><option value="">Type</option><option value="Small">Small</option><option value="Large">Large</option></select><select value={form.size} onChange={e=>setForm({...form, size:e.target.value})} className="bg-black/40 p-3 rounded-xl border border-white/10">{CARTON_SIZES.map(s=><option key={s} value={s}>{s}"</option>)}</select></>
          )}
          {form.mainCategory === 'Jambo' && (
            <><select value={form.jamboCategory} onChange={e=>setForm({...form, jamboCategory:e.target.value})} className="bg-black/40 p-3 rounded-xl border border-white/10"><option value="">Jambo</option>{JAMBO_CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}</select><input value={form.micron} onChange={e=>setForm({...form, micron:e.target.value})} placeholder="Micron" className="bg-black/40 p-3 rounded-xl border border-white/10" /><input value={form.width} onChange={e=>setForm({...form, width:e.target.value})} placeholder="Width" className="bg-black/40 p-3 rounded-xl border border-white/10" /></>
          )}
          <input type="number" value={form.qty} onChange={e=>setForm({...form, qty:e.target.value})} placeholder="Qty" className="bg-black/40 p-3 rounded-xl border border-white/10" />
          <input type="number" value={form.rate} onChange={e=>setForm({...form, rate:e.target.value})} placeholder="Rate" className="bg-black/40 p-3 rounded-xl border border-white/10" />
          <button onClick={addItem} className="bg-emerald-500 text-black font-bold p-3 rounded-xl"><Plus/></button>
        </div>
      </div>

      <div className="bg-white/5 rounded-3xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-white/5 text-gray-500 uppercase text-xs"><tr><th className="p-4">Category</th><th className="p-4">Specs</th><th className="p-4">Qty</th><th className="p-4">Rate</th><th className="p-4">Total</th><th className="p-4"></th></tr></thead>
          <tbody className="divide-y divide-white/5">
            {rows.map(r=>(<tr key={r.id} className="hover:bg-white/5"><td className="p-4 font-bold text-emerald-500">{r.mainCategory}</td><td className="p-4">{r.specsLabel}</td><td className="p-4">{r.qty}</td><td className="p-4">{r.rate}</td><td className="p-4 font-bold">Rs. {r.amount.toLocaleString()}</td><td className="p-4"><button onClick={()=>setRows(p=>p.filter(x=>x.id!==r.id))}><Trash2 className="text-red-500" size={16}/></button></td></tr>))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PurchaseInvoice;
