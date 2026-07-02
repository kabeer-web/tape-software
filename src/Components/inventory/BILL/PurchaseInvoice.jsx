import { useState, useContext, useRef, useEffect } from 'react';
import { StockContext } from '../StockContext';
import { useAccounts } from '../ACCOUNTS/AccountsContext';
import { getLedgerEntries } from '../../../api';
import {
  Plus, Trash2, Save, FileText, Package, Archive, Layers,
  Printer, Upload, X, ChevronDown, Calculator, AlertCircle, CheckCircle2
} from 'lucide-react';

// --- CONSTANTS ---
const PURCHASE_PARTIES = [
  'UNIVERSAL COTTING','KOSHER','CHAWLA INDUSTRY',
  'IBAD CORE','TAHSEEN CARTON','TALHA WASEEM',
  'ASGHR CORE','DEER TAPE','SAMAD BHAI',
];

const JAMBO_CATEGORIES = ['Clear','Tan','Cloth','Masking','Tissue','SuperYellow','SuperClear','Color','Foam'];
const CARTON_SIZES = ['10', '10.5', '11', '12'];
const PLY_OPTIONS = ['5', '6', '8', '10'];
const BRANDS = ['Tesco','Bell','Race','Jhonson','Local','Imported'];

// --- Number to words logic ---
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

const ADDR  = 'PLOT #356-5, SECTOR 5-B, SAEEDABAD BALDIA TOWN S.I.T.E KARACHI';

// --- HTML Print Generator ---
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

  return `<!DOCTYPE html><html><head><title>Purchase Bill #${billNo}</title>
<style>
  body{font-family:sans-serif;font-size:12px;padding:40px;color:#000}
  .hdr{display:flex;justify-content:space-between;border-bottom:3px solid #000;padding-bottom:15px;margin-bottom:20px}
  .meta-grid{display:grid;grid-template-columns:repeat(3, 1fr);gap:15px;margin-bottom:25px}
  .meta-item{border:1px solid #ddd;padding:10px;border-radius:5px}
  .meta-label{font-size:9px;text-transform:uppercase;color:#666;font-weight:bold}
  table{width:100%;border-collapse:collapse;margin-bottom:25px}
  th{background:#f4f4f4;padding:10px;border:1.5px solid #000;text-transform:uppercase;font-size:10px}
  td{padding:10px;border:1px solid #ddd}
  .footer-area{display:flex;justify-content:space-between;gap:20px;align-items:flex-start}
  .total-card{width:250px;border:2.5px solid #000;padding:15px;text-align:center}
  .sigs{display:grid;grid-template-columns:repeat(3,1fr);gap:50px;margin-top:80px}
  .sig-line{border-top:1.5px solid #000;text-align:center;padding-top:8px;font-weight:bold;text-transform:uppercase}
</style></head><body>
<div class="hdr">
  <div><h1 style="margin:0;font-size:24px">HS PACKAGES</h1><p>${ADDR}</p></div>
  <div style="text-align:right"><h1>PURCHASE BILL</h1><p>Original Record</p></div>
</div>
<div class="meta-grid">
  <div class="meta-item"><div class="meta-label">Supplier</div><div style="font-size:14px;font-weight:bold">${partyName}</div></div>
  <div class="meta-item"><div class="meta-label">Bill / Chalan No</div><div style="font-size:14px;font-weight:bold">#${billNo} / ${chalanNo || '—'}</div></div>
  <div class="meta-item"><div class="meta-label">Date</div><div style="font-size:14px;font-weight:bold">${date}</div></div>
</div>
<table>
  <thead><tr><th>#</th><th>Category</th><th>Specifications</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
  <tbody>${rowsHtml}</tbody>
</table>
<div class="footer-area">
  <div style="flex:1;border:1px solid #ddd;padding:15px;border-radius:5px">
    <div class="meta-label">Amount in Words</div>
    <div style="font-style:italic;font-weight:bold;margin-top:5px">"${toWords(grandTotal)}"</div>
  </div>
  <div class="total-card">
    <div class="meta-label">Net Payable (PKR)</div>
    <div style="font-size:24px;font-weight:900">${grandTotal.toLocaleString()}</div>
  </div>
</div>
<div class="sigs"><div class="sig-line">Purchase Manager</div><div class="sig-line">Warehouse Incharge</div><div class="sig-line">Accounts Dept</div></div>
<script>window.onload=()=>{window.print();window.onafterprint=()=>window.close()}</script>
</body></html>`;
};

const emptyForm = {
  mainCategory: 'Core',
  brand:'', side:'', ply:'',
  cartonType:'', size:'',
  jamboCategory:'', color:'', micron:'', width:'',
  qty:'', rate:''
};

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
  const [partyBalance, setPartyBalance] = useState(null);

  const flash = (text, ok = true) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg({ text: '', ok: true }), 5000);
  };

  const fetchPartyBalance = async (name) => {
    if (!name || !name.trim()) return;
    try {
      const entries = await getLedgerEntries(name.trim());
      const totalDebit  = entries.filter(e => e.entry_type === 'debit' ).reduce((s,e)=>s+(Number(e.amount)||0),0);
      const totalCredit = entries.filter(e => e.entry_type === 'credit').reduce((s,e)=>s+(Number(e.amount)||0),0);
      setPartyBalance(totalDebit - totalCredit);
    } catch (err) { setPartyBalance(null); }
  };

  const buildSpecsLabel = (f) => {
    if (f.mainCategory === 'Core') return `${f.brand} | ${f.side} | ${f.ply} Ply`;
    if (f.mainCategory === 'Carton') return `${f.brand} | ${f.cartonType} | ${f.size}"`;
    return `${f.jamboCategory} ${f.micron ? f.micron+'μ' : ''} ${f.width ? f.width+'mm' : ''} ${f.color || ''}`;
  };

  const addItem = () => {
    const qty = parseFloat(form.qty);
    const rate = parseFloat(form.rate);
    if (!qty || !rate) return flash('❌ Qty aur Rate bharein', false);

    setRows(p => [...p, {
      id: Date.now(), ...form, qty, rate, amount: qty * rate,
      specsLabel: buildSpecsLabel(form)
    }]);
    setForm({ ...emptyForm, mainCategory: form.mainCategory });
  };

  const removeRow = (id) => setRows(p => p.filter(r => r.id !== id));
  const grandTotal = rows.reduce((s, r) => s + r.amount, 0);

  const handleSaveBill = async () => {
    if (!supplierName.trim() || rows.length === 0) return flash('❌ Form incomplete hai', false);
    if (!window.confirm(`Kya aap ${rows.length} items ka stock add karna chahte hain?`)) return;

    setSaving(true);
    try {
      // 1. Update Stock for each row
      for (const r of rows) {
        let payload = { category: r.mainCategory, brand: r.brand, qty: r.qty };
        if (r.mainCategory === 'Core') payload = { ...payload, side: r.side, ply: r.ply };
        if (r.mainCategory === 'Carton') payload = { ...payload, carton_type: r.cartonType, size: r.size };
        if (r.mainCategory === 'Jambo') payload = { category: r.jamboCategory, micron: r.micron, width: r.width, yards: r.qty, color: r.color };
        
        await addRoll(payload);
      }

      // 2. Save Bill and update Ledger
      await saveBill({
        billType: 'Purchase',
        billNo,
        partyName: supplierName.toUpperCase(),
        date,
        items: rows,
        grandTotal,
        chalanNo
      });

      flash(`✅ Purchase Recorded & Stock Updated!`);
      setRows([]); setBillNo(''); setSupplierName(''); setChalanNo('');
    } catch (err) { flash('❌ Error: ' + err.message, false); }
    finally { setSaving(false); }
  };

  const handlePrint = () => {
    if (rows.length === 0) return;
    const html = generatePurchasePrintHTML({ billNo, partyName: supplierName.toUpperCase(), date, items: rows, grandTotal, chalanNo });
    const w = window.open('', '_blank'); w.document.write(html); w.document.close();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 text-slate-200">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-white flex items-center gap-3">
            <Archive className="text-[#22c55e]" size={36} />
            PURCHASE <span className="text-[#22c55e] italic">INVOICE</span>
          </h1>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mt-1">Raw Material & Inventory Inward</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleSaveBill} disabled={rows.length === 0 || saving} className="bg-white/[0.05] border border-[#22c55e]/30 text-[#22c55e] px-6 py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-[#22c55e]/10 transition disabled:opacity-20 uppercase text-xs tracking-widest">
            {saving ? <div className="w-4 h-4 border-2 border-t-transparent animate-spin rounded-full"/> : <Save size={16}/>} Save Bill
          </button>
          <button onClick={handlePrint} disabled={rows.length === 0} className="bg-[#22c55e] text-black font-black px-6 py-3 rounded-2xl flex items-center gap-2 hover:scale-105 active:scale-95 transition uppercase text-xs tracking-widest shadow-lg shadow-emerald-500/20">
            <Printer size={16}/> Print Bill
          </button>
        </div>
      </div>

      {msg.text && (
        <div className={`mb-8 p-4 rounded-2xl flex items-center gap-3 border animate-in slide-in-from-top-4 duration-500 ${msg.ok ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
          {msg.ok ? <CheckCircle2 size={20}/> : <AlertCircle size={20}/>}
          <span className="font-bold text-sm">{msg.text}</span>
        </div>
      )}

      {/* Main Info Card */}
      <div className="bg-white/[0.02] border border-white/5 p-8 rounded-[2.5rem] mb-6 shadow-inner">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Supplier Name</label>
            <input list="purchase-parties" value={supplierName} onChange={e=>setSupplierName(e.target.value)} onBlur={()=>fetchPartyBalance(supplierName)} placeholder="Select/Type Supplier" className="w-full bg-black/40 p-4 rounded-2xl border border-white/10 outline-none focus:border-[#22c55e] font-bold" />
            <datalist id="purchase-parties">{PURCHASE_PARTIES.map(p=><option key={p} value={p}/>)}</datalist>
          </div>
          <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Bill Number</label><input value={billNo} onChange={e=>setBillNo(e.target.value)} placeholder="000" className="w-full bg-black/40 p-4 rounded-2xl border border-white/10 outline-none focus:border-[#22c55e] font-bold" /></div>
          <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Chalan / DC</label><input value={chalanNo} onChange={e=>setChalanNo(e.target.value)} placeholder="Optional" className="w-full bg-black/40 p-4 rounded-2xl border border-white/10 outline-none focus:border-[#22c55e] font-bold" /></div>
          <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Date</label><input value={date} onChange={e=>setDate(e.target.value)} className="w-full bg-black/40 p-4 rounded-2xl border border-white/10 outline-none font-bold" /></div>
        </div>
        {partyBalance !== null && <p className="mt-4 text-[11px] font-black text-[#22c55e] uppercase tracking-tighter bg-[#22c55e]/5 w-fit px-4 py-1.5 rounded-full border border-[#22c55e]/20">Current Balance: Rs. {partyBalance.toLocaleString()}</p>}
      </div>

      {/* Entry Form */}
      <div className="bg-white/[0.02] border border-white/5 p-8 rounded-[2.5rem] mb-6">
        <div className="flex p-1.5 bg-black/40 border border-white/5 rounded-2xl w-fit mb-8">
          {['Core','Carton','Jambo'].map(cat => (
            <button key={cat} onClick={()=>setForm({...emptyForm, mainCategory: cat})} className={`px-8 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${form.mainCategory===cat?'bg-[#22c55e] text-black shadow-lg shadow-emerald-500/20':'text-slate-500 hover:text-white'}`}>{cat}</button>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 items-end">
          {form.mainCategory === 'Core' && (
            <>
              <div className="space-y-1"><label className="text-[9px] font-bold text-slate-600 uppercase ml-1">Brand</label><select value={form.brand} onChange={e=>setForm({...form, brand:e.target.value})} className="w-full bg-black/40 p-3.5 rounded-xl border border-white/10 outline-none text-sm font-bold cursor-pointer">{BRANDS.map(b=><option key={b} value={b}>{b}</option>)}</select></div>
              <div className="space-y-1"><label className="text-[9px] font-bold text-slate-600 uppercase ml-1">Side</label><select value={form.side} onChange={e=>setForm({...form, side:e.target.value})} className="w-full bg-black/40 p-3.5 rounded-xl border border-white/10 outline-none text-sm font-bold cursor-pointer"><option value="">Side</option><option value="Single">Single</option><option value="Double">Double</option></select></div>
              <div className="space-y-1"><label className="text-[9px] font-bold text-slate-600 uppercase ml-1">Ply</label><select value={form.ply} onChange={e=>setForm({...form, ply:e.target.value})} className="w-full bg-black/40 p-3.5 rounded-xl border border-white/10 outline-none text-sm font-bold cursor-pointer"><option value="">Ply</option>{PLY_OPTIONS.map(p=><option key={p} value={p}>{p} Ply</option>)}</select></div>
            </>
          )}
          {form.mainCategory === 'Carton' && (
            <>
              <div className="space-y-1"><label className="text-[9px] font-bold text-slate-600 uppercase ml-1">Brand</label><select value={form.brand} onChange={e=>setForm({...form, brand:e.target.value})} className="w-full bg-black/40 p-3.5 rounded-xl border border-white/10 outline-none text-sm font-bold cursor-pointer">{BRANDS.map(b=><option key={b} value={b}>{b}</option>)}</select></div>
              <div className="space-y-1"><label className="text-[9px] font-bold text-slate-600 uppercase ml-1">Type</label><select value={form.cartonType} onChange={e=>setForm({...form, cartonType:e.target.value})} className="w-full bg-black/40 p-3.5 rounded-xl border border-white/10 outline-none text-sm font-bold cursor-pointer"><option value="">Type</option><option value="Small">Small</option><option value="Large">Large</option></select></div>
              <div className="space-y-1"><label className="text-[9px] font-bold text-slate-600 uppercase ml-1">Size</label><select value={form.size} onChange={e=>setForm({...form, size:e.target.value})} className="w-full bg-black/40 p-3.5 rounded-xl border border-white/10 outline-none text-sm font-bold cursor-pointer"><option value="">Size</option>{CARTON_SIZES.map(s=><option key={s} value={s}>{s}"</option>)}</select></div>
            </>
          )}
          {form.mainCategory === 'Jambo' && (
            <>
              <div className="space-y-1"><label className="text-[9px] font-bold text-slate-600 uppercase ml-1">Type</label><select value={form.jamboCategory} onChange={e=>setForm({...form, jamboCategory:e.target.value})} className="w-full bg-black/40 p-3.5 rounded-xl border border-white/10 outline-none text-sm font-bold cursor-pointer"><option value="">Select Jambo</option>{JAMBO_CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
              <div className="space-y-1"><label className="text-[9px] font-bold text-slate-600 uppercase ml-1">Micron</label><input value={form.micron} onChange={e=>setForm({...form, micron:e.target.value})} placeholder="μ" className="w-full bg-black/40 p-3.5 rounded-xl border border-white/10 outline-none text-sm font-bold" /></div>
              <div className="space-y-1"><label className="text-[9px] font-bold text-slate-600 uppercase ml-1">Width</label><input value={form.width} onChange={e=>setForm({...form, width:e.target.value})} placeholder="mm" className="w-full bg-black/40 p-3.5 rounded-xl border border-white/10 outline-none text-sm font-bold" /></div>
            </>
          )}
          <div className="space-y-1"><label className="text-[9px] font-bold text-slate-600 uppercase ml-1">Quantity</label><input type="number" value={form.qty} onChange={e=>setForm({...form, qty:e.target.value})} placeholder="0" className="w-full bg-black/40 p-3.5 rounded-xl border border-white/10 outline-none text-sm font-bold" /></div>
          <div className="space-y-1"><label className="text-[9px] font-bold text-slate-600 uppercase ml-1">Rate</label><input type="number" value={form.rate} onChange={e=>setForm({...form, rate:e.target.value})} placeholder="0" className="w-full bg-black/40 p-3.5 rounded-xl border border-white/10 outline-none text-sm font-bold" /></div>
          <button onClick={addItem} className="bg-[#22c55e] text-black font-black p-3.5 rounded-xl flex items-center justify-center hover:bg-emerald-400 transition shadow-lg shadow-emerald-500/10"><Plus size={20}/></button>
        </div>
      </div>

      {/* Item Table */}
      <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] overflow-hidden mb-8 shadow-inner">
        <table className="w-full text-left">
          <thead className="bg-white/5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
            <tr><th className="p-6">#</th><th>Category</th><th>Specs</th><th>Qty</th><th>Rate</th><th>Amount</th><th className="text-right p-6">Action</th></tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.map((r, i) => (
              <tr key={r.id} className="hover:bg-white/5 transition-all group">
                <td className="p-6 text-sm font-bold text-slate-600">{i+1}</td>
                <td className="p-6 font-black text-[#22c55e] uppercase text-xs">{r.mainCategory}</td>
                <td className="p-6 text-sm font-bold text-slate-300">{r.specsLabel}</td>
                <td className="p-6 font-mono text-sm">{r.qty}</td>
                <td className="p-6 font-mono text-sm">{r.rate.toLocaleString()}</td>
                <td className="p-6 font-black text-white">Rs. {r.amount.toLocaleString()}</td>
                <td className="p-6 text-right"><button onClick={()=>removeRow(r.id)} className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100 shadow-lg"><Trash2 size={16}/></button></td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={7} className="p-20 text-center text-slate-600 font-bold uppercase tracking-widest italic">No items added to invoice yet.</td></tr>
