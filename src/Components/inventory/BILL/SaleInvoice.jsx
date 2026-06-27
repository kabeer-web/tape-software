import { useState, useRef, useContext } from 'react';
import {
  FileText, Plus, Trash2, Printer,
  Upload, X, Save, AlertCircle, CheckCircle2, Box, ArrowRight, Info
} from 'lucide-react';
import { useAccounts } from '../ACCOUNTS/AccountsContext';
import { StockContext } from '../StockContext';

// ── Number to words ──────────────────────────────────────
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

const COLOURS = ['Clear','Tan','Cloth','Masking','Tissue','Super Yellow','Super Clear','Color','Foam','Black','White','Brown','Silver','Custom'];
const BRANDS        = ['Tesco','Bell','Race','Jhonson','HS Packages','Local','Imported'];
const MICRONS       = ['37μ','39μ','40μ','42μ','43μ','44μ','45μ','48μ','50μ'];
const SIZE_MM       = ['720','900','1280','1600','2400'];
const SIZE_INCH     = ['1/2"','1"','2"','3"','4"','6"','Custom'];
const YARDS_LIST    = ['40','50','80','100','150','200'];
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
      <select value={custom ? '__custom__' : value} onChange={e => handleSelect(e.target.value)} className="bg-black/40 p-3 rounded-2xl border border-white/5 outline-none text-sm focus:border-emerald-500 transition-all">
        <option value="">{placeholder}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
        <option value="__custom__">✏️ Custom...</option>
      </select>
      {custom && <input autoFocus value={value} onChange={e => onChange(e.target.value)} placeholder="Type value..." className="bg-black/60 p-2.5 rounded-2xl border border-emerald-500/40 outline-none text-sm" />}
    </div>
  );
};

const ErrMsg = ({ msg }) => msg ? <p className="text-red-400 text-[10px] mt-1 flex items-center gap-1"><AlertCircle size={10}/>{msg}</p> : null;

// ── DESIGN REDESIGN: Print HTML Generator ────────────────
export const generateInvoiceHTML = (bill) => {
  const { billNo, partyName, date, items, grandTotal, totalCartonCount, logo } = bill;
  const logoHtml = logo ? `<img src="${logo}" style="height:70px;object-fit:contain;"/>` : `<div style="font-size:28px;font-weight:900;letter-spacing:-1px;">HS PACKAGES</div>`;

  const rowsHtml = (items || []).map((r, i) => {
    const size = r.sizeLabel || [r.sizeMm ? `${r.sizeMm}mm` : '', r.sizeInch ? `${r.sizeInch}` : '', r.yards ? `${r.yards}yds` : ''].filter(Boolean).join(' / ');
    return `
    <tr>
      <td style="text-align:center">${i + 1}</td>
      <td style="font-weight:700">${size}</td>
      <td>${r.colour || '—'}</td>
      <td>${r.brand || '—'}</td>
      <td style="text-align:center">${r.micron || '—'}</td>
      <td style="text-align:center">${r.totalCarton}</td>
      <td style="text-align:center">${r.perCtnQty}</td>
      <td style="text-align:center;font-weight:700;background:#f9f9f9;">${r.totalQty}</td>
      <td style="text-align:right">${(r.rate || 0).toLocaleString()}</td>
      <td style="text-align:right;font-weight:900;border-right:1px solid #000">${(r.total || 0).toLocaleString()}</td>
    </tr>`;
  }).join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Invoice #${billNo}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Inter', sans-serif;font-size:11px;color:#000;padding:40px 50px;line-height:1.4;background:#fff}
  .hdr{display:flex;justify-content:space-between;border-bottom:4px solid #000;padding-bottom:20px;margin-bottom:25px;align-items:center}
  .co-name{margin-bottom:5px}
  .co-info{font-size:10px;color:#333;font-weight:500;max-width:300px}
  .inv-title{text-align:right}
  .inv-title h1{font-size:35px;font-weight:900;letter-spacing:8px;margin-bottom:5px;color:#e2e2e2}
  .inv-details{font-weight:bold;font-size:14px;color:#000}
  
  .meta-grid{display:grid;grid-template-columns:1.5fr 1fr;gap:30px;margin-bottom:30px}
  .buyer-card{border:2px solid #000;padding:15px;border-radius:0px}
  .meta-item{display:flex;justify-content:space-between;border-bottom:1px solid #ddd;padding:8px 0}
  .meta-label{font-size:9px;text-transform:uppercase;color:#666;font-weight:bold}
  .meta-value{font-size:12px;font-weight:800}

  table{width:100%;border-collapse:collapse;margin-bottom:30px}
  thead th{background:#000;color:#fff;padding:12px 5px;font-size:9px;text-transform:uppercase;border:1px solid #000}
  tbody td{padding:10px 5px;border:1px solid #eee;border-bottom:1px solid #ccc}
  tbody tr:nth-child(even){background:#fafafa}

  .footer-area{display:flex;justify-content:space-between;gap:30px;align-items:flex-start}
  .words-box{flex:1;border-top:2px solid #000;padding-top:10px}
  .total-box{width:300px;background:#000;color:#fff;padding:20px;text-align:right}
  .total-label{font-size:10px;font-weight:bold;text-transform:uppercase;margin-bottom:5px;display:block;opacity:0.8}
  .total-val{font-size:32px;font-weight:900}

  .sigs{display:grid;grid-template-columns:repeat(3,1fr);gap:60px;margin-top:100px}
  .sig-line{border-top:1.5px solid #000;text-align:center;padding-top:10px;font-weight:bold;font-size:10px;text-transform:uppercase}
  @media print{@page{margin:0}body{padding:40px}}
</style></head><body>
<div class="hdr">
  <div><div class="co-name">${logoHtml}</div><div class="co-info">${ADDR}<br/>${PHONE}</div></div>
  <div class="inv-title"><h1>INVOICE</h1><div class="inv-details">NO: #${billNo}</div></div>
</div>
<div class="meta-grid">
  <div class="buyer-card"><div class="meta-label" style="margin-bottom:8px">Billed To</div><div style="font-size:18px;font-weight:900">${partyName || '—'}</div></div>
  <div>
    <div class="meta-item"><span class="meta-label">Date of Issue</span><span class="meta-value">${date}</span></div>
    <div class="meta-item"><span class="meta-label">Total Cartons</span><span class="meta-value">${totalCartonCount} CTN</span></div>
  </div>
</div>
<table>
  <thead><tr><th>#</th><th>Description</th><th>Color</th><th>Brand</th><th>MIC</th><th>CTN</th><th>P/C</th><th>Total</th><th>Rate</th><th>Total</th></tr></thead>
  <tbody>${rowsHtml}</tbody>
</table>
<div class="footer-area">
  <div class="words-box">
    <div class="meta-label" style="margin-bottom:5px">Amount in Words</div>
    <div style="font-size:12px;font-weight:bold;font-style:italic">"${toWords(grandTotal)}"</div>
  </div>
  <div class="total-box">
    <span class="total-label">Grand Total Payable</span>
    <div class="total-val">Rs. ${grandTotal.toLocaleString()}</div>
  </div>
</div>
<div class="sigs">
  <div class="sig-line">Prepared By</div>
  <div class="sig-line">Receiver Name</div>
  <div class="sig-line">Authorized Signatory</div>
</div>
<script>window.onload=()=>{window.print();window.onafterprint=()=>window.close()}</script>
</body></html>`;
};

const SaleInvoice = () => {
  const { saveBill }                  = useAccounts();
  const { inventory, updateStock }    = useContext(StockContext);

  const [billNo,     setBillNo]     = useState('');
  const [buyerName,  setBuyerName]  = useState('');
  const [date,       setDate]       = useState(new Date().toLocaleDateString('en-GB'));
  const [form,       setForm]       = useState(emptyItem);
  const [formErrs,   setFormErrs]   = useState({});
  const [headerErrs, setHeaderErrs] = useState({});
  const [rows,       setRows]       = useState([]);
  const [carton,     setCarton]     = useState(emptyCarton);
  const [logo,       setLogo]       = useState(null);
  const [msg,        setMsg]        = useState('');
  const [cartonMsg,  setCartonMsg]  = useState(''); 
  const [saving,     setSaving]     = useState(false);
  const fileRef = useRef(null);

  const upd  = (k, v) => { setForm(p => ({...p, [k]: v})); setFormErrs(p => ({...p, [k]: ''})); };
  const updC = (k, v) => setCarton(p => ({...p, [k]: v}));

  const validateItem = () => {
    const e = {};
    if (!form.sizeMm && !form.sizeInch) e.size = 'Size required';
    if (!form.totalCarton) e.totalCarton = 'Required';
    if (!form.perCtnQty) e.perCtnQty = 'Required';
    if (!form.rate) e.rate = 'Required';
    setFormErrs(e);
    return Object.keys(e).length === 0;
  };

  const validateHeader = () => {
    const e = {};
    if (!billNo.trim()) e.billNo = 'Bill No required';
    if (!buyerName.trim()) e.buyerName = 'Buyer name required';
    setHeaderErrs(e);
    return Object.keys(e).length === 0;
  };

  const addItem = () => {
    if (!validateItem()) return;
    const tc = parseFloat(form.totalCarton) || 0;
    const pc = parseFloat(form.perCtnQty)   || 0;
    const r  = parseFloat(form.rate)        || 0;
    const totalQty = tc * pc;
    const total    = totalQty * r;
    const sizeLabel = [form.sizeMm ? `${form.sizeMm}mm` : '', form.sizeInch ? `${form.sizeInch}` : '', form.yards ? `${form.yards}yds` : ''].filter(Boolean).join(' / ');
    setRows(p => [...p, { id: Date.now(), ...form, sizeLabel, totalCarton: tc, perCtnQty: pc, rate: r, totalQty, total }]);
    setForm(emptyItem);
  };

  const handleSave = async () => {
    if (!validateHeader()) return;
    if (rows.length === 0) { setMsg('❌ Koi item add nahi hua!'); return; }
    setSaving(true);
    try {
      if (carton.brand && carton.qty) {
        const cartonInv = inventory.find(i => i.brand === carton.brand && i.category === 'Carton' && (i.carton_type || i.cartonType) === carton.type && String(i.size) === String(carton.size));
        if (cartonInv) {
          await updateStock(cartonInv._id, -parseInt(carton.qty));
          setCartonMsg(`SUCCESS: ${carton.qty} Cartons deducted from ${carton.brand} stock.`);
        }
      }
      await saveBill({ billType: 'Sale', billNo, partyName: buyerName, date, items: rows, grandTotal, totalCartonCount, cartonUsed: carton.brand ? carton : null, logo });
      setMsg(`✅ Bill #${billNo} saved to database!`);
      setRows([]); setBillNo(''); setBuyerName(''); setCarton(emptyCarton); setHeaderErrs({});
      setTimeout(() => { setMsg(''); setCartonMsg(''); }, 6000);
    } catch (err) { setMsg('❌ Error: ' + err.message); } finally { setSaving(false); }
  };

  const handlePrint = () => {
    if (rows.length === 0) return;
    const html = generateInvoiceHTML({ billNo, partyName: buyerName, date, items: rows, grandTotal, totalCartonCount, logo });
    const w = window.open('', '_blank'); w.document.write(html); w.document.close();
  };

  const grandTotal = rows.reduce((s, r) => s + r.total, 0);
  const totalCartonCount = rows.reduce((s, r) => s + (r.totalCarton || 0), 0);

  return (
    <div className="text-white min-h-screen pb-10">
      
      {/* Header with Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-black italic tracking-tighter">SALE <span className="text-[#22c55e]">INVOICE</span></h1>
          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">HS Packages Industrial Management</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleSave} disabled={rows.length===0 || saving} className="bg-[#22c55e]/10 border border-[#22c55e]/20 text-[#22c55e] font-black px-6 py-3 rounded-2xl flex items-center gap-2 hover:bg-[#22c55e]/20 transition-all disabled:opacity-20 text-xs uppercase tracking-tighter"><Save size={16}/>{saving ? 'Processing...' : 'Save Database'}</button>
          <button onClick={handlePrint} disabled={rows.length===0} className="bg-[#22c55e] text-black font-black px-6 py-3 rounded-2xl flex items-center gap-2 hover:scale-105 transition-all disabled:opacity-20 text-xs uppercase tracking-tighter shadow-[0_0_20px_rgba(34,197,94,0.3)]"><Printer size={16}/> Print Bill</button>
        </div>
      </div>

      {/* FEEDBACK NOTIFICATIONS */}
      <div className="space-y-3 mb-6">
        {cartonMsg && (
          <div className="p-4 rounded-[1.5rem] bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center gap-3 animate-in fade-in slide-in-from-top duration-500">
             <div className="bg-blue-500/20 p-2 rounded-xl"><Box size={18}/></div>
             <p className="text-sm font-black italic uppercase tracking-tight">{cartonMsg}</p>
          </div>
        )}
        {msg && (
          <div className={`p-4 rounded-[1.5rem] font-bold border flex items-center gap-3 ${msg.startsWith('✅') ? 'bg-[#22c55e]/10 border-[#22c55e]/40 text-[#22c55e]' : 'bg-red-500/10 border-red-500/40 text-red-400'}`}>
            <CheckCircle2 size={18}/> {msg}
          </div>
        )}
      </div>

      {/* Bill Meta Card */}
      <div className="bg-white/[0.03] p-8 rounded-[2.5rem] border border-white/5 mb-6 shadow-2xl backdrop-blur-xl">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] text-gray-500 uppercase font-black ml-1">Invoice No</label>
            <input value={billNo} onChange={e=>setBillNo(e.target.value)} placeholder="0001" className="w-full bg-black/40 p-4 rounded-2xl border border-white/10 outline-none focus:border-[#22c55e] font-bold text-white transition-all"/>
            <ErrMsg msg={headerErrs.billNo}/>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] text-gray-500 uppercase font-black ml-1">Customer / Party Name</label>
            <input value={buyerName} onChange={e=>setBuyerName(e.target.value)} placeholder="Search or Enter Name" className="w-full bg-black/40 p-4 rounded-2xl border border-white/10 outline-none focus:border-[#22c55e] font-bold text-white transition-all"/>
            <ErrMsg msg={headerErrs.buyerName}/>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] text-gray-500 uppercase font-black ml-1">Billing Date</label>
            <input value={date} onChange={e=>setDate(e.target.value)} className="w-full bg-black/40 p-4 rounded-2xl border border-white/10 outline-none font-bold text-gray-400"/>
          </div>
        </div>
      </div>

      {/* Add Items Form */}
      <div className="bg-white/[0.03] p-8 rounded-[2.5rem] border border-white/5 mb-6 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
           <div className="p-2 bg-[#22c55e]/10 rounded-lg"><Plus className="text-[#22c55e]" size={20}/></div>
           <h3 className="text-sm font-black uppercase tracking-[0.2em]">Add Product to List</h3>
        </div>
        
        <div className="flex bg-black/40 p-1 rounded-2xl border border-white/5 w-fit mb-6">
          <button onClick={() => upd('sizeUnit', 'mm')} className={`px-8 py-2.5 text-[10px] font-black uppercase rounded-xl transition-all ${form.sizeUnit === 'mm' ? 'bg-[#22c55e] text-black shadow-lg' : 'text-gray-500'}`}>MM</button>
          <button onClick={() => upd('sizeUnit', 'inch')} className={`px-8 py-2.5 text-[10px] font-black uppercase rounded-xl transition-all ${form.sizeUnit === 'inch' ? 'bg-[#22c55e] text-black shadow-lg' : 'text-gray-500'}`}>Inches</button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
          {form.sizeUnit === 'mm' ? <SelectOrCustom value={form.sizeMm} onChange={v => upd('sizeMm', v)} options={SIZE_MM} placeholder="Size mm"/> : <SelectOrCustom value={form.sizeInch} onChange={v => upd('sizeInch', v)} options={SIZE_INCH} placeholder="Size inch"/>}
          <SelectOrCustom value={form.yards} onChange={v => upd('yards', v)} options={YARDS_LIST} placeholder="Yards"/>
          <SelectOrCustom value={form.colour} onChange={v => upd('colour', v)} options={COLOURS} placeholder="Colour"/>
          <SelectOrCustom value={form.brand} onChange={v => upd('brand', v)} options={BRANDS} placeholder="Brand"/>
          <SelectOrCustom value={form.micron} onChange={v => upd('micron', v)} options={MICRONS} placeholder="Micron"/>
          <input type="number" placeholder="Total CTN" value={form.totalCarton} onChange={e => upd('totalCarton', e.target.value)} className="bg-black/40 p-4 rounded-2xl border border-white/10 text-sm outline-none focus:border-[#22c55e]"/>
          <input type="number" placeholder="Qty/Ctn" value={form.perCtnQty} onChange={e => upd('perCtnQty', e.target.value)} className="bg-black/40 p-4 rounded-2xl border border-white/10 text-sm outline-none focus:border-[#22c55e]"/>
          <input type="number" placeholder="Rate" value={form.rate} onChange={e => upd('rate', e.target.value)} className="bg-black/40 p-4 rounded-2xl border border-white/10 text-sm outline-none focus:border-[#22c55e] font-black text-emerald-400"/>
          <button onClick={addItem} className="col-span-2 bg-[#22c55e] text-black font-black p-4 rounded-2xl hover:scale-[1.02] active:scale-95 transition-all text-xs uppercase tracking-widest flex items-center justify-center gap-2"><Plus size={18}/> Add to Bill</button>
        </div>
      </div>

      {/* Internal Stock Sync Section */}
      <div className="bg-amber-500/5 p-8 rounded-[2.5rem] border-2 border-amber-500/10 mb-6 relative overflow-hidden group">
        <div className="absolute right-0 top-0 opacity-5 -rotate-12 group-hover:rotate-0 transition-transform"><Box size={180}/></div>
        <div className="flex items-center gap-3 mb-6 relative z-10">
           <div className="p-2 bg-amber-500 rounded-xl text-black shadow-lg"><Box size={20}/></div>
           <h3 className="text-xs font-black text-amber-500 uppercase tracking-[0.2em]">Inventory Automatic Deduction</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10">
          <select value={carton.brand} onChange={e => updC('brand', e.target.value)} className="bg-black/40 p-4 rounded-2xl border border-amber-500/20 outline-none text-sm">{CARTON_BRANDS.map(b => <option key={b} value={b}>{b}</option>)}</select>
          <select value={carton.type} onChange={e => updC('type', e.target.value)} className="bg-black/40 p-4 rounded-2xl border border-amber-500/20 outline-none text-sm"><option value="Small">Small</option><option value="Large">Large</option></select>
          <select value={carton.size} onChange={e => updC('size', e.target.value)} className="bg-black/40 p-4 rounded-2xl border border-amber-500/20 outline-none text-sm">{CARTON_SIZES.map(s => <option key={s} value={s}>{s}"</option>)}</select>
          <div className="relative">
            <input type="number" value={carton.qty} onChange={e => updC('qty', e.target.value)} placeholder="Sync Qty" className="w-full bg-black/60 p-4 rounded-2xl border-2 border-amber-500/40 outline-none text-sm font-black text-amber-500"/>
            <ArrowRight className="absolute right-4 top-1/2 -translate-y-1/2 text-amber-500" size={18}/>
          </div>
        </div>
      </div>

      {/* Main Items Table */}
      <div className="bg-white/[0.01] rounded-[2.5rem] border border-white/5 overflow-hidden mb-8 shadow-inner">
        <table className="w-full text-left">
          <thead className="bg-white/5 text-[10px] uppercase font-black text-slate-500 tracking-widest">
            <tr><th className="p-6">Description</th><th className="text-center">CTN</th><th className="text-center">Total Rolls</th><th className="text-right">Rate</th><th className="text-right p-6">Amount</th><th className="p-6"></th></tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.map((r, i) => (
              <tr key={r.id} className="hover:bg-white/5 transition-colors group">
                <td className="p-6">
                  <p className="font-black text-white text-base leading-tight uppercase tracking-tighter">{r.brand} - {r.colour}</p>
                  <p className="text-[10px] text-gray-500 font-bold mt-1">{r.sizeLabel} • {r.micron}</p>
                </td>
                <td className="text-center font-black text-[#22c55e] text-lg">{r.totalCarton}</td>
                <td className="text-center text-slate-400 font-bold">{r.totalQty} <small className="text-[9px] opacity-50">PCS</small></td>
                <td className="text-right font-mono text-xs text-slate-300">{r.rate.toLocaleString()}</td>
                <td className="text-right font-black text-white text-2xl p-6">Rs. {r.total.toLocaleString()}</td>
                <td className="p-6 text-right"><button onClick={() => setRows(rows.filter(x => x.id !== r.id))} className="bg-red-500/10 p-3 rounded-2xl text-red-500 hover:bg-red-500 hover:text-white transition-all"><Trash2 size={16}/></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10 flex flex-col justify-center">
            <p className="text-[10px] uppercase font-black text-gray-500 tracking-widest mb-3">Amount in Words</p>
            <p className="text-sm font-black text-slate-300 italic">"{toWords(grandTotal)}"</p>
        </div>
        <div className="bg-[#22c55e] p-8 rounded-[3rem] flex items-center justify-between shadow-[0_20px_50px_rgba(34,197,94,0.4)]">
            <div className="text-emerald-950 font-black uppercase tracking-tighter leading-tight">
               <span className="opacity-60 text-xs">Total Billable</span>
               <p className="text-lg">{totalCartonCount} Cartons Dispatch</p>
            </div>
            <p className="text-5xl font-black text-emerald-950 tracking-tighter">Rs. {grandTotal.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
};

export default SaleInvoice;
