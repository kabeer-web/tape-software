import { useState, useRef, useContext, useEffect } from 'react';
import {
  FileText, Plus, Trash2, Printer,
  Upload, X, Save, AlertCircle, CheckCircle2, Box, Database, ArrowRight
} from 'lucide-react';
import { useAccounts } from '../ACCOUNTS/AccountsContext';
import { StockContext } from '../StockContext';

// ── Number to words logic ────────────────────────────────
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
const PHONE = 'Phone: 0313-2400511 & 0308-7058453';

const COLOURS = ['Clear','Tan','Cloth','Masking','Tissue','Super Yellow','Super Clear','Color','Foam','Black','White','Brown','Silver'];
const BRANDS        = ['Tesco','Bell','Race','Jhonson','HS Packages','Local','Imported'];
const MICRONS       = ['37μ','39μ','40μ','42μ','43μ','44μ','45μ','48μ'];
const SIZE_MM       = ['720','900','1280','1600','2400'];
const SIZE_INCH     = ['1/2"','1"','2"','3"','4"','6"'];
const CARTON_BRANDS = ['Bell','Race','Tesco','Jhonson'];
const CARTON_SIZES  = ['10','10.5','11','12'];

const emptyItem   = { sizeUnit:'mm', sizeMm:'', sizeInch:'', yards:'', colour:'', brand:'', micron:'', totalCarton:'', perCtnQty:'', rate:'' };
const emptyCarton = { brand:'', type:'', size:'', qty:'' };

const SelectOrCustom = ({ value, onChange, options, placeholder }) => {
  const isCustom = value !== '' && !options.includes(value);
  const [custom,  setCustom]  = useState(isCustom);
  const handleSelect = (v) => { if (v === '__custom__') { setCustom(true); onChange(''); } else { setCustom(false); onChange(v); } };
  return (
    <div className="flex flex-col gap-1">
      <select value={custom ? '__custom__' : value} onChange={e => handleSelect(e.target.value)} className="bg-black/30 p-2.5 rounded-xl border border-white/10 outline-none text-sm focus:border-emerald-500 transition-all">
        <option value="">{placeholder}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
        <option value="__custom__">✏️ Custom...</option>
      </select>
      {custom && <input autoFocus value={value} onChange={e => onChange(e.target.value)} placeholder="Type value..." className="bg-black/40 p-2 rounded-xl border border-emerald-500/50 outline-none text-sm" />}
    </div>
  );
};

// ── PREMIUM PRINT HTML GENERATOR ────────────────────────
export const generateInvoiceHTML = (bill) => {
  const { billNo, partyName, date, items, grandTotal, totalCartonCount, logo } = bill;
  const logoImgHtml = logo ? `<img src="${logo}" style="height:65px; object-fit:contain;"/>` : '';

  const rowsHtml = (items || []).map((r, i) => `
    <tr>
      <td style="text-align:center; border:1px solid #000; padding:8px;">${i + 1}</td>
      <td style="font-weight:bold; border:1px solid #000; padding:8px;">${r.sizeLabel}</td>
      <td style="border:1px solid #000; padding:8px;">${r.colour || '—'}</td>
      <td style="border:1px solid #000; padding:8px;">${r.brand || '—'}</td>
      <td style="text-align:center; border:1px solid #000; padding:8px;">${r.micron || '—'}</td>
      <td style="text-align:center; border:1px solid #000; padding:8px;">${Number(r.totalCarton)}</td>
      <td style="text-align:center; border:1px solid #000; padding:8px;">${Number(r.perCtnQty)}</td>
      <td style="text-align:center; font-weight:bold; background:#f9f9f9; border:1px solid #000; padding:8px;">${Number(r.totalQty)}</td>
      <td style="text-align:right; border:1px solid #000; padding:8px;">${(r.rate || 0).toLocaleString()}</td>
      <td style="text-align:right; border:1px solid #000; font-weight:900; padding:8px;">${(r.total || 0).toLocaleString()}</td>
    </tr>`).join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Invoice #${billNo}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box; font-family:'Inter', 'Segoe UI', sans-serif;}
  body{padding:40px; color:#000; background:#fff; line-height:1.2;}
  .hdr{display:flex; justify-content:space-between; align-items:center; border-bottom:5px solid #000; padding-bottom:15px; margin-bottom:25px;}
  .logo-area{display:flex; align-items:center; gap:20px;}
  .co-name{font-size:32px; font-weight:900; letter-spacing:-1.5px; text-transform:uppercase; color:#000;}
  .co-tagline{font-size:10px; letter-spacing:4px; color:#444; font-weight:bold; display:block; margin-top:-5px;}
  .co-info{font-size:10px; color:#333; margin-top:8px; font-weight:500; line-height:1.5;}
  .inv-title-box{text-align:right;}
  .inv-label{font-size:48px; font-weight:900; color:#f0f0f0; letter-spacing:8px; display:block; margin-bottom:-15px;}
  .inv-no{font-size:18px; font-weight:bold; color:#000;}
  
  .meta-grid{display:grid; grid-template-columns:1.5fr 1fr; gap:30px; margin-bottom:25px;}
  .buyer-box{border:3px solid #000; padding:15px; background:#fafafa;}
  .meta-table{width:100%; border-collapse:collapse;}
  .meta-table td{padding:6px; font-size:12px; border-bottom:1px solid #ddd;}
  .meta-lbl{font-weight:bold; text-transform:uppercase; color:#666; font-size:10px; width:120px;}

  .main-table{width:100%; border-collapse:collapse; margin-bottom:25px; border:2px solid #000;}
  .main-table th{background:#000; color:#fff; padding:12px 5px; font-size:10px; text-transform:uppercase; border:1px solid #000;}
  
  .footer-flex{display:flex; justify-content:space-between; gap:30px; align-items:flex-start;}
  .total-box{width:320px; border:5px solid #000; padding:20px; text-align:right;}
  .total-val{font-size:32px; font-weight:900;}

  .sigs{display:grid; grid-template-columns:repeat(3, 1fr); gap:50px; margin-top:100px;}
  .sig-line{border-top:2px solid #000; text-align:center; padding-top:10px; font-weight:bold; font-size:11px; text-transform:uppercase;}
  @media print{@page{margin:12mm; size:A4}}
</style></head><body>
<div class="hdr">
  <div class="logo-area">
    ${logoImgHtml}
    <div>
      <span class="co-name">HS PACKAGES</span>
      <span class="co-tagline">Excellence in Packaging</span>
      <div class="co-info">${ADDR}<br/>${PHONE}</div>
    </div>
  </div>
  <div class="inv-title-box">
    <span class="inv-label">INVOICE</span>
    <div class="inv-no">No: #<strong>${billNo}</strong></div>
    <div style="font-size:12px; margin-top:5px;">Date: ${date}</div>
  </div>
</div>

<div class="meta-grid">
  <div class="buyer-box">
    <div style="font-size:10px; font-weight:bold; color:#777; margin-bottom:5px; text-transform:uppercase;">Bill To / Customer:</div>
    <div style="font-size:22px; font-weight:900;">${partyName}</div>
  </div>
  <div>
    <table class="meta-table">
       <tr><td class="meta-lbl">Total Cartons</td><td style="font-weight:900; font-size:16px;">${Number(totalCartonCount)} Units</td></tr>
       <tr><td class="meta-lbl">Currency</td><td style="font-weight:bold;">PKR (Rs.)</td></tr>
    </table>
  </div>
</div>

<table class="main-table">
  <thead><tr><th>#</th><th style="width:30%">Description</th><th>Color</th><th>Brand</th><th>MIC</th><th>CTN</th><th>P.Qty</th><th>Total</th><th>Rate</th><th>Amount</th></tr></thead>
  <tbody>${rowsHtml}</tbody>
</table>

<div class="footer-flex">
  <div style="flex:1; border:1px solid #ccc; padding:15px; border-radius:4px;">
    <div style="font-size:10px; font-weight:bold; text-transform:uppercase; color:#666; margin-bottom:5px;">Amount in Words</div>
    <div style="font-size:13px; font-weight:bold; font-style:italic;">"${toWords(grandTotal)}"</div>
  </div>
  <div class="total-box">
    <div style="font-size:10px; font-weight:bold; text-transform:uppercase; margin-bottom:5px;">Net Payable Amount</div>
    <div class="total-val">Rs. ${grandTotal.toLocaleString()}</div>
  </div>
</div>

<div class="sigs">
  <div class="sig-line">Prepared By</div>
  <div class="sig-line">Receiver's Sign</div>
  <div class="sig-line">Authorized Signatory</div>
</div>
<script>window.onload=()=>{window.print();window.onafterprint=()=>window.close();}</script>
</body></html>`;
};

const SaleInvoice = () => {
  const { saveBill }                  = useAccounts();
  const { inventory, updateStock, refreshInventory } = useContext(StockContext);

  const [billNo,     setBillNo]     = useState('');
  const [buyerName,  setBuyerName]  = useState('');
  const [date,       setDate]       = useState(new Date().toLocaleDateString('en-GB'));
  const [form,       setForm]       = useState(emptyItem);
  const [rows,       setRows]       = useState([]);
  const [carton,     setCarton]     = useState(emptyCarton);
  const [logo,       setLogo]       = useState(null);
  const [popMsg,     setPopMsg]     = useState('');
  const [availableStock, setAvailableStock] = useState(null);
  const [saving,     setSaving]     = useState(false);
  const fileRef = useRef(null);

  // ── AUTO STOCK FETCHING (ROBUST MATCHING) ──
  useEffect(() => {
    if (carton.brand && carton.type && carton.size) {
      const match = inventory.find(i => 
        String(i.brand).toLowerCase() === String(carton.brand).toLowerCase() && 
        (String(i.category).toLowerCase() === 'carton' || String(i.type).toLowerCase() === 'carton') && 
        String(i.carton_type || i.cartonType || '').toLowerCase() === String(carton.type).toLowerCase() && 
        parseFloat(i.size) === parseFloat(carton.size)
      );
      setAvailableStock(match ? match.qty : 0);
    } else {
      setAvailableStock(null);
    }
  }, [carton.brand, carton.type, carton.size, inventory]);

  const upd  = (k, v) => setForm(p => ({...p, [k]: v}));
  const updC = (k, v) => setCarton(p => ({...p, [k]: v}));

  // ── MANUAL DEDUCT LOGIC ──
  const handleRemoveCarton = async () => {
    if (!carton.brand || !carton.qty || carton.qty <= 0) {
      alert("Please enter valid Brand and Quantity.");
      return;
    }
    const match = inventory.find(i => 
        String(i.brand).toLowerCase() === String(carton.brand).toLowerCase() && 
        (String(i.category).toLowerCase() === 'carton' || String(i.type).toLowerCase() === 'carton') && 
        String(i.carton_type || i.cartonType || '').toLowerCase() === String(carton.type).toLowerCase() && 
        parseFloat(i.size) === parseFloat(carton.size)
    );

    if (match) {
      await updateStock(match._id || match.id, -parseInt(carton.qty));
      setPopMsg(`INVENTORY UPDATED: ${carton.qty} Cartons removed from ${carton.brand} ${carton.type} (${carton.size}") stock.`);
      setTimeout(() => setPopMsg(''), 6000);
      refreshInventory();
    } else {
      alert("Error: Matching carton not found in database.");
    }
  };

  const addItem = () => {
    if (!form.totalCarton || !form.rate) return;
    const tc = parseFloat(form.totalCarton);
    const pc = parseFloat(form.perCtnQty);
    const totalQty = tc * pc;
    const sizeLabel = [form.sizeMm ? `${form.sizeMm}mm` : '', form.sizeInch ? `${form.sizeInch}` : '', form.yards ? `${form.yards}yds` : ''].filter(Boolean).join(' / ');
    setRows(p => [...p, { id: Date.now(), ...form, sizeLabel, totalQty, total: totalQty * parseFloat(form.rate) }]);
    setForm(emptyItem);
  };

  const handleSave = async () => {
    if (!billNo || !buyerName || rows.length === 0) return;
    setSaving(true);
    await saveBill({ billType: 'Sale', billNo, partyName: buyerName, date, items: rows, grandTotal: rows.reduce((s,r)=>s+r.total,0), totalCartonCount: rows.reduce((s,r)=>s+Number(r.totalCarton),0), logo });
    setPopMsg(`✅ DATABASE SYNC: Bill #${billNo} has been saved successfully.`);
    setRows([]); setBillNo(''); setBuyerName(''); setSaving(false);
    setTimeout(() => setPopMsg(''), 5000);
  };

  const handlePrint = () => {
    const html = generateInvoiceHTML({ billNo, partyName: buyerName, date, items: rows, grandTotal: rows.reduce((s,r)=>s+r.total,0), totalCartonCount: rows.reduce((s,r)=>s+Number(r.totalCarton),0), logo });
    const w = window.open('', '_blank'); w.document.write(html); w.document.close();
  };

  const grandTotal = rows.reduce((s, r) => s + r.total, 0);
  const totalCartonCount = rows.reduce((s, r) => s + (Number(r.totalCarton) || 0), 0);

  return (
    <div className="text-white min-h-screen pb-10 max-w-6xl mx-auto px-4">
      
      {/* GLOBAL NOTIFICATION POP-UP */}
      {popMsg && (
        <div className="fixed top-10 right-10 z-50 bg-emerald-500 text-black p-5 rounded-2xl shadow-[0_20px_50px_rgba(16,185,129,0.5)] border border-white/20 animate-in slide-in-from-right duration-500 flex items-center gap-4 max-w-md">
           <div className="bg-black/20 p-2 rounded-full"><CheckCircle2 size={24}/></div>
           <p className="font-black text-sm tracking-tight">{popMsg}</p>
           <button onClick={()=>setPopMsg('')}><X size={18}/></button>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-8 pt-8">
        <div>
          <h1 className="text-4xl font-black italic tracking-tighter text-emerald-500">HS <span className="text-white font-black">PACKAGES</span></h1>
          <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em] ml-1">Automated Dispatch System</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleSave} disabled={saving || rows.length === 0} className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 px-6 py-3 rounded-2xl font-black text-xs hover:bg-emerald-500 hover:text-black transition-all flex items-center gap-2"><Save size={16}/>{saving ? 'SAVING...' : 'SAVE DATA'}</button>
          <button onClick={handlePrint} className="bg-emerald-500 text-black px-6 py-3 rounded-2xl font-black text-xs flex items-center gap-2 hover:scale-105 transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)]"><Printer size={16}/> PRINT INVOICE</button>
        </div>
      </div>

      {/* Bill Meta & LOGO */}
      <div className="bg-white/[0.02] border border-white/10 p-8 rounded-[2.5rem] mb-6 flex flex-col md:flex-row gap-8 items-center backdrop-blur-xl">
        <div className="shrink-0 text-center">
          {logo ? (
            <div className="relative group"><img src={logo} className="h-20 w-auto object-contain rounded-xl border border-white/10 p-2 bg-black/20"/><button onClick={()=>setLogo(null)} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 shadow-lg"><X size={12}/></button></div>
          ) : (
            <button onClick={()=>fileRef.current?.click()} className="w-28 h-20 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center text-gray-500 hover:border-emerald-500 hover:text-emerald-500 transition-all"><Upload size={24}/><span className="text-[8px] font-black mt-1">SELECT LOGO</span></button>
          )}
          <input ref={fileRef} type="file" accept="image/*" onChange={(e)=>{const f=e.target.files[0]; if(f){const rd=new FileReader(); rd.onload=()=>setLogo(rd.result); rd.readAsDataURL(f);}}} className="hidden"/>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 w-full">
          <div className="space-y-1"><label className="text-[10px] text-gray-500 font-black uppercase">Invoice Number</label><input value={billNo} onChange={e=>setBillNo(e.target.value)} placeholder="001" className="w-full bg-black/40 p-4 rounded-2xl border border-white/5 outline-none focus:border-emerald-500 font-bold"/></div>
          <div className="space-y-1"><label className="text-[10px] text-gray-500 font-black uppercase">Customer Name</label><input value={buyerName} onChange={e=>setBuyerName(e.target.value)} placeholder="Type name..." className="w-full bg-black/40 p-4 rounded-2xl border border-white/5 outline-none focus:border-emerald-500 font-bold"/></div>
          <div className="space-y-1"><label className="text-[10px] text-gray-500 font-black uppercase">Bill Date</label><input value={date} onChange={e=>setDate(e.target.value)} className="w-full bg-black/40 p-4 rounded-2xl border border-white/5 outline-none font-bold text-slate-400"/></div>
        </div>
      </div>

      {/* Add Items Form */}
      <div className="bg-white/[0.02] border border-white/10 p-8 rounded-[2.5rem] mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <div className="col-span-2 md:col-span-1 flex bg-black/40 p-1 rounded-2xl border border-white/10 h-fit">
            <button onClick={()=>upd('sizeUnit','mm')} className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all ${form.sizeUnit==='mm'?'bg-emerald-500 text-black shadow-lg':'text-gray-500'}`}>MM</button>
            <button onClick={()=>upd('sizeUnit','inch')} className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all ${form.sizeUnit==='inch'?'bg-emerald-500 text-black shadow-lg':'text-gray-500'}`}>INCH</button>
          </div>
          {form.sizeUnit === 'mm' ? <SelectOrCustom value={form.sizeMm} onChange={v=>upd('sizeMm',v)} options={SIZE_MM} placeholder="Size MM"/> : <SelectOrCustom value={form.sizeInch} onChange={v=>upd('sizeInch',v)} options={SIZE_INCH} placeholder="Size INCH"/>}
          <SelectOrCustom value={form.yards} onChange={v=>upd('yards',v)} options={['40','50','80','100','150','200']} placeholder="Yards"/>
          <SelectOrCustom value={form.colour} onChange={v=>upd('colour',v)} options={COLOURS} placeholder="Colour"/>
          <SelectOrCustom value={form.brand} onChange={v=>upd('brand',v)} options={BRANDS} placeholder="Brand"/>
          <input type="number" placeholder="Cartons" value={form.totalCarton} onChange={e=>upd('totalCarton',e.target.value)} className="bg-black/40 p-4 rounded-2xl border border-white/10 outline-none text-sm"/>
          <input type="number" placeholder="Qty/Ctn" value={form.perCtnQty} onChange={e=>upd('perCtnQty',e.target.value)} className="bg-black/40 p-4 rounded-2xl border border-white/10 outline-none text-sm"/>
          <input type="number" placeholder="Rate" value={form.rate} onChange={e=>upd('rate',e.target.value)} className="bg-black/40 p-4 rounded-2xl border border-white/10 outline-none text-sm font-black text-emerald-400"/>
          <button onClick={addItem} className="col-span-2 bg-white/5 border border-emerald-500/30 text-emerald-500 font-black p-4 rounded-2xl hover:bg-emerald-500 hover:text-black transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-widest"><Plus size={18}/> Add to Bill</button>
        </div>
      </div>

      {/* ADVANCED STOCK SYNC (FETCH & REMOVE) */}
      <div className="bg-amber-500/5 border-2 border-amber-500/20 p-8 rounded-[2.5rem] mb-8 relative overflow-hidden group">
        <div className="absolute right-0 top-0 opacity-10 rotate-12"><Database size={200}/></div>
        <div className="flex items-center justify-between mb-6">
           <div className="flex items-center gap-3"><div className="p-3 bg-amber-500 rounded-2xl text-black shadow-lg"><Box size={22}/></div><div><p className="text-amber-500 font-black uppercase tracking-widest text-[10px]">Stock Link</p><h3 className="text-white font-bold">Remove Carton from Stock</h3></div></div>
           {availableStock !== null && (
             <div className={`px-4 py-2 rounded-xl font-black text-xs border ${availableStock > 5 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400 animate-pulse'}`}>
               CURRENT DATABASE: {Number(availableStock)} CTN
             </div>
           )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 relative z-10">
          <select value={carton.brand} onChange={e=>updC('brand',e.target.value)} className="bg-black/60 p-4 rounded-2xl border border-amber-500/20 outline-none text-sm">{CARTON_BRANDS.map(b=><option key={b} value={b}>{b}</option>)}</select>
          <select value={carton.type} onChange={e=>updC('type',e.target.value)} className="bg-black/60 p-4 rounded-2xl border border-amber-500/20 outline-none text-sm"><option value="Small">Small</option><option value="Large">Large</option></select>
          <select value={carton.size} onChange={e=>updC('size',e.target.value)} className="bg-black/60 p-4 rounded-2xl border border-amber-500/20 outline-none text-sm">{CARTON_SIZES.map(s=> <option key={s} value={s}>{s}"</option>)}</select>
          <input type="number" value={carton.qty} onChange={e=>updC('qty',e.target.value)} placeholder="Qty to Deduct" className="w-full bg-black/60 p-4 rounded-2xl border border-amber-500/20 outline-none text-sm font-black text-amber-500"/>
          <button onClick={handleRemoveCarton} className="bg-amber-500 text-black font-black p-4 rounded-2xl flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all text-[10px] uppercase shadow-lg shadow-amber-500/20">REMOVE FROM STOCK</button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white/[0.01] border border-white/5 rounded-[2.5rem] overflow-hidden mb-8">
        <table className="w-full text-left">
          <thead className="bg-white/5 text-[10px] font-black text-gray-500 uppercase tracking-widest"><tr><th className="p-6">Description</th><th className="text-center">CTN</th><th className="text-center">Total Rolls</th><th className="text-right">Rate</th><th className="text-right p-6">Amount</th><th className="p-6"></th></tr></thead>
          <tbody className="divide-y divide-white/5">
            {rows.map(r => (
              <tr key={r.id} className="hover:bg-white/5 transition-all"><td className="p-6"><p className="font-black text-white text-base leading-tight uppercase tracking-tighter">{r.brand} - {r.colour}</p><p className="text-[10px] text-gray-500 font-bold mt-1 uppercase tracking-tighter">{r.sizeLabel}</p></td><td className="text-center font-black text-emerald-500 text-2xl">{Number(r.totalCarton)}</td><td className="text-center text-gray-400 font-bold">{Number(r.totalQty)} <small className="text-[8px] opacity-40 uppercase">PCS</small></td><td className="text-right font-mono text-xs text-gray-300">{r.rate.toLocaleString()}</td><td className="text-right font-black text-white text-2xl p-6">Rs. {r.total.toLocaleString()}</td><td className="p-6 text-right"><button onClick={()=>setRows(rows.filter(x=>x.id!==r.id))} className="bg-red-500/10 p-3 rounded-xl text-red-500 hover:bg-red-500 transition-all shadow-lg shadow-red-500/10"><Trash2 size={18}/></button></td></tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Final Totals */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] flex flex-col justify-center shadow-lg"><p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-3">Total Amount in Words</p><p className="text-sm font-black text-slate-400 italic">"${toWords(grandTotal)}"</p></div>
        <div className="bg-gradient-to-br from-emerald-400 to-emerald-600 p-8 rounded-[3rem] flex items-center justify-between shadow-[0_30px_60px_rgba(16,185,129,0.3)] border-t border-white/20"><div className="text-emerald-950 font-black uppercase tracking-tighter leading-tight"><span className="opacity-60 text-xs">Total Dispatch</span><p className="text-lg">{Number(totalCartonCount)} Cartons Total</p></div><p className="text-5xl font-black text-emerald-950 tracking-tighter">Rs. {grandTotal.toLocaleString()}</p></div>
      </div>
    </div>
  );
};

export default SaleInvoice;
