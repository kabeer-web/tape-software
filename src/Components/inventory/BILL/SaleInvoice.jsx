import { useState, useRef, useContext } from 'react';
import {
  FileText, Plus, Trash2, Printer,
  Upload, X, Save, AlertCircle, Box
} from 'lucide-react';

// ✅ Vercel Build Paths (Fixed)
import { useAccounts } from '../ACCOUNTS/AccountsContext';
import { StockContext } from '../StockContext';

// ── Parties List ──────────────────────────────
const PARTIES = [
  "AR PACKAGES", "ROSHAN TRADER", "HUZAIFA TRADER", "SHAMS STATIONARY", "ABDUL RAUF",
  "HAMZULLAH", "ANEES STATIONARY", "A ONE", "ZEESHAN HYD", "ABDUL BASIT", "MD TRADERS",
  "MUNEER BHAI", "ANWAR BHAI", "FAROOQ BHAI", "GR TRADER", "HAMZA SIALKOT",
  "HASHMI TRADER", "GAIN TEX INTERNATIONAL", "NAQI TAQI", "MEMON ELECTRIC", "MOK",
  "PAKISTAN TRADER", "SABIR BROTHER 1", "SABIR BROTHER 2", "SHERAZ HABIB",
  "SANAULLAH TEXTILE", "SUJJAD ALI", "USAMA STATIONARY", "ZEESHAN HAIDRABAD",
  "WAHEED", "WALI", "AL FAREED", "SHOKAT", "HAYAT GUL", "AMIR AJ", "ARSALAN HAS",
  "MUDASIR MEMON", "UMAIR FISHERY", "AMEER AKBAR", "ISMAIL BHAI", "BILAL BHAI",
  "FARHAN NEW KARACHI", "N.K ENTERPRISES"
];

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
const emptyCarton = { brand:'', type:'Small', size:'10', qty:'' };

const SelectOrCustom = ({ value, onChange, options, placeholder }) => {
  const isCustom = value !== '' && !options.includes(value);
  const [custom,  setCustom]  = useState(isCustom);
  const handleSelect = (v) => { if (v === '__custom__') { setCustom(true); onChange(''); } else { setCustom(false); onChange(v); } };
  return (
    <div className="flex flex-col gap-1">
      <select value={custom ? '__custom__' : value} onChange={e => handleSelect(e.target.value)} className="bg-black/30 p-2.5 rounded-xl border border-[#22c55e]/20 outline-none text-sm">
        <option value="">{placeholder}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
        <option value="__custom__">✏️ Custom...</option>
      </select>
      {custom && <input autoFocus value={value} onChange={e => onChange(e.target.value)} placeholder="Type value..." className="bg-black/30 p-2 rounded-xl border border-[#22c55e]/40 outline-none text-sm" />}
    </div>
  );
};

const ErrMsg = ({ msg }) => msg ? <p className="text-red-400 text-[10px] mt-1 flex items-center gap-1"><AlertCircle size={10}/>{msg}</p> : null;

// ── Professional Print Generator ─────────────────────────────────
export const generateInvoiceHTML = (bill) => {
  const { billNo, partyName, date, items, grandTotal, totalCartonCount, logo } = bill;
  const logoHtml = logo ? `<img src="${logo}" style="height:60px;object-fit:contain;"/>` : `<div style="font-size:24px;font-weight:900;">HS Packages</div>`;

  const rowsHtml = (items || []).map((r, i) => {
    const size = r.sizeLabel || [r.sizeMm ? `${r.sizeMm}mm` : '', r.sizeInch ? `${r.sizeInch}` : '', r.yards ? `${r.yards}yds` : ''].filter(Boolean).join(' / ');
    return `
    <tr>
      <td style="text-align:center">${i + 1}</td>
      <td style="font-weight:600">${size}</td>
      <td>${r.colour || '—'}</td>
      <td>${r.brand || '—'}</td>
      <td style="text-align:center">${r.micron || '—'}</td>
      <td style="text-align:center">${r.totalCarton}</td>
      <td style="text-align:center">${r.perCtnQty}</td>
      <td style="text-align:center;font-weight:700">${r.totalQty}</td>
      <td style="text-align:right">${(r.rate || 0).toLocaleString()}</td>
      <td style="text-align:right;font-weight:700">${(r.total || 0).toLocaleString()}</td>
    </tr>`;
  }).join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Invoice #${billNo}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Segoe UI',Arial,sans-serif;font-size:11px;color:#000;padding:30px 40px;line-height:1.4}
  .hdr{display:flex;justify-content:space-between;border-bottom:3px solid #000;padding-bottom:15px;margin-bottom:20px}
  .co-info{font-size:10px;color:#333;font-weight:500}
  .inv-title{text-align:right}
  .inv-title h1{font-size:28px;font-weight:900;letter-spacing:4px;margin-bottom:5px}
  .meta-grid{display:grid;grid-template-columns:repeat(3, 1fr);gap:15px;margin-bottom:25px}
  .meta-item{border:1px solid #ddd;padding:10px;border-radius:5px}
  .meta-label{font-size:8px;text-transform:uppercase;color:#666;font-weight:bold;margin-bottom:3px}
  .meta-value{font-size:12px;font-weight:700}
  table{width:100%;border-collapse:collapse;margin-bottom:25px}
  thead th{background:#f0f0f0;color:#000;padding:10px 5px;font-size:9px;text-transform:uppercase;border:1.5px solid #000}
  tbody td{padding:8px 5px;border:1px solid #eee;border-bottom:1px solid #ddd}
  .footer-area{display:flex;justify-content:space-between;gap:20px;align-items:flex-start}
  .words-box{flex:1;border:1px solid #ddd;padding:12px;border-radius:5px;min-height:60px}
  .total-card{width:280px;border:3px solid #000;padding:15px;text-align:center;border-radius:8px}
  .total-val{font-size:26px;font-weight:900}
  .sigs{display:grid;grid-template-columns:repeat(3,1fr);gap:50px;margin-top:80px}
  .sig-line{border-top:1.5px solid #000;text-align:center;padding-top:8px;font-weight:bold;font-size:10px;text-transform:uppercase}
  @media print{@page{margin:10mm;size:A4}}
</style></head><body>
<div class="hdr">
  <div>${logoHtml}<div class="co-info">${ADDR}<br/>${PHONE}</div></div>
  <div class="inv-title"><h1>INVOICE</h1><div style="font-weight:bold;font-size:12px">Original Copy</div></div>
</div>
<div class="meta-grid">
  <div class="meta-item"><div class="meta-label">Customer / Buyer</div><div class="meta-value">${partyName || '—'}</div></div>
  <div class="meta-item"><div class="meta-label">Invoice Number</div><div class="meta-value">#${billNo || '—'}</div></div>
  <div class="meta-item"><div class="meta-label">Date of Issue</div><div class="meta-value">${date}</div></div>
</div>
<table>
  <thead><tr><th>#</th><th>Product Description</th><th>Color</th><th>Brand</th><th>MIC</th><th>CTN</th><th>P.Qty</th><th>Total Qty</th><th>Rate</th><th>Amount</th></tr></thead>
  <tbody>${rowsHtml}</tbody>
</table>
<div class="footer-area">
  <div class="words-box">
    <div class="meta-label" style="margin-bottom:8px">Amount in Words</div>
    <div style="font-size:11px;font-weight:bold;font-style:italic">"${toWords(grandTotal)}"</div>
    <div style="margin-top:15px;font-size:12px;font-weight:bold">Total Cartons: ${totalCartonCount} CTN</div>
  </div>
  <div class="total-card">
    <div class="total-label">Grand Total (PKR)</div>
    <div class="total-val">${grandTotal.toLocaleString()}</div>
  </div>
</div>
<div class="sigs">
  <div class="sig-line">Prepared By</div>
  <div class="sig-line">Receiver's Signature</div>
  <div class="sig-line">Authorized Manager</div>
</div>
<script>window.onload=()=>{window.print();window.onafterprint=()=>window.close()}</script>
</body></html>`;
};

const SaleInvoice = () => {
  const { saveBill, postLedger }      = useAccounts();
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
    const total = tc * r;
    const sizeLabel = [form.sizeMm ? `${form.sizeMm}mm` : '', form.sizeInch ? `${form.sizeInch}` : '', form.yards ? `${form.yards}yds` : ''].filter(Boolean).join(' / ');
    setRows(p => [...p, { id: Date.now(), ...form, sizeLabel, totalCarton: tc, perCtnQty: pc, rate: r, totalQty, total }]);
    setForm(emptyItem);
  };

  const removeRow = (id) => setRows(p => p.filter(r => r.id !== id));

  const handleSave = async () => {
    if (!validateHeader()) return;
    if (rows.length === 0) { setMsg('❌ Koi item add nahi hua!'); return; }

    // Validate carton stock BEFORE saving anything — previously a missing
    // or insufficient carton match failed silently (bill saved as if the
    // carton deduction happened, when it either didn't happen at all or
    // was clamped short without telling anyone).
    let cartonInv = null;
    const cartonQty = parseInt(carton.qty) || 0;
    if (carton.brand && cartonQty > 0) {
      cartonInv = inventory.find(i => i.brand === carton.brand && i.category === 'Carton' && (i.carton_type || i.cartonType) === carton.type && String(i.size) === String(carton.size));
      if (!cartonInv) {
        setMsg(`❌ No matching carton stock found for ${carton.brand} ${carton.type} ${carton.size}" — add it to inventory first.`);
        return;
      }
      if (Number(cartonInv.qty || 0) < cartonQty) {
        setMsg(`❌ Not enough carton stock: only ${cartonInv.qty} available, need ${cartonQty}.`);
        return;
      }
    }

    setSaving(true);
    try {
      // Save the bill first. If carton stock adjustment fails after this,
      // the bill still exists as a record — safer than the reverse order,
      // where a stock deduction could succeed with no bill to explain it.
      const savedBill = await saveBill({ billType: 'Sale', billNo, partyName: buyerName, date, items: rows, grandTotal, totalCartonCount, cartonUsed: carton.brand ? carton : null, logo });

      await postLedger({
        party_name: buyerName,
        party_type: 'Sale',
        entry_type: 'debit', // customer owes us — see convention in AccountsContext.jsx
        description: `Sale Bill #${billNo || savedBill.id}`,
        amount: grandTotal,
        date,
        ref_bill_no: billNo,
        bill_id: savedBill.id,
      });

      if (cartonInv) {
        await updateStock(cartonInv._id || cartonInv.id, -cartonQty);
        setCartonMsg(`Inventory Updated: ${cartonQty} ${carton.brand} ${carton.type} Cartons deducted successfully.`);
      }

      setMsg(`✅ Bill #${billNo} save ho gaya!`);
      setRows([]); setBillNo(''); setBuyerName(''); setCarton(emptyCarton); setHeaderErrs({});
      setTimeout(() => { setMsg(''); setCartonMsg(''); }, 6000);
    } catch (err) { setMsg('❌ Error: ' + err.message); } finally { setSaving(false); }
  };

  const handlePrint = () => {
    if (!validateHeader()) return;
    if (rows.length === 0) return;
    const html = generateInvoiceHTML({ billNo, partyName: buyerName, date, items: rows, grandTotal, totalCartonCount, logo });
    const w = window.open('', '_blank'); w.document.write(html); w.document.close();
  };

  const grandTotal = rows.reduce((s, r) => s + r.total, 0);
  const totalCartonCount = rows.reduce((s, r) => s + (r.totalCarton || 0), 0);

  return (
    <div className="text-white min-h-screen pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3"><FileText className="text-[#22c55e]" size={22}/><div><h1 className="text-2xl font-black">SALE <span className="text-[#22c55e]">INVOICE</span></h1><p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Ready for Printing</p></div></div>
        <div className="flex gap-2">
          <button onClick={handleSave} disabled={rows.length===0 || saving} className="bg-white/[0.05] border border-[#22c55e]/30 text-[#22c55e] font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 hover:bg-[#22c55e]/10 transition disabled:opacity-30 text-sm"><Save size={14}/>{saving ? 'Saving...' : 'Save Bill'}</button>
          <button onClick={handlePrint} disabled={rows.length===0} className="bg-[#22c55e] text-black font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 hover:bg-[#1db954] transition disabled:opacity-30 text-sm"><Printer size={14}/> Print</button>
        </div>
      </div>

      {cartonMsg && (
        <div className="mb-4 p-4 rounded-2xl bg-blue-500/10 border border-blue-500/40 text-blue-400 flex items-center gap-3 animate-in slide-in-from-top duration-300">
           <Box size={20} />
           <p className="text-sm font-bold tracking-wide">{cartonMsg}</p>
        </div>
      )}

      {msg && <div className={`mb-4 p-3 rounded-xl text-sm font-bold border ${msg.startsWith('✅') ? 'bg-[#22c55e]/10 border-[#22c55e]/40 text-[#22c55e]' : 'bg-red-500/10 border-red-500/40 text-red-400'}`}>{msg}</div>}

      <div className="bg-white/[0.03] p-6 rounded-[2rem] border border-[#22c55e]/20 mb-5">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/5 mb-4">
          <div className="flex items-center gap-4">
            {logo ? <div className="relative group shrink-0"><img src={logo} className="h-14 w-auto object-contain rounded-xl border border-white/10 p-1"/><button onClick={() => setLogo(null)} className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full p-0.5"><X size={9}/></button></div> : <button onClick={() => fileRef.current?.click()} className="flex flex-col items-center justify-center gap-1 w-16 h-14 border-2 border-dashed border-[#22c55e]/30 rounded-xl text-[#22c55e]/50 hover:border-[#22c55e] transition text-[8px] font-bold"><Upload size={13}/>LOGO</button>}
            <input ref={fileRef} type="file" accept="image/*" onChange={(e)=>{const f=e.target.files[0]; if(f){const rd=new FileReader(); rd.onload=()=>setLogo(rd.result); rd.readAsDataURL(f);}}} className="hidden"/>
            <div><p className="text-xl font-black">HS Packages</p><p className="text-[10px] text-gray-500 max-w-[200px]">{ADDR}</p></div>
          </div>
          <p className="text-2xl font-black text-[#22c55e] tracking-[0.2em] italic uppercase">Invoice</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1"><label className="text-[10px] text-gray-500 uppercase font-black ml-1">Bill No</label><input value={billNo} onChange={e=>setBillNo(e.target.value)} placeholder="1001" className="w-full bg-black/30 p-3 rounded-2xl border border-[#22c55e]/20 outline-none focus:border-[#22c55e]"/>{headerErrs.billNo && <ErrMsg msg={headerErrs.billNo}/>}</div>
          
          <div className="space-y-1">
            <label className="text-[10px] text-gray-500 uppercase font-black ml-1">Buyer Name</label>
            <input list="parties-list" value={buyerName} onChange={e=>setBuyerName(e.target.value.toUpperCase())} placeholder="Search Party" className="w-full bg-black/30 p-3 rounded-2xl border border-[#22c55e]/20 outline-none focus:border-[#22c55e]"/>
            <datalist id="parties-list">{PARTIES.map((p,i) => <option key={i} value={p}/>)}</datalist>
            {headerErrs.buyerName && <ErrMsg msg={headerErrs.buyerName}/>}
          </div>

          <div className="space-y-1"><label className="text-[10px] text-gray-500 uppercase font-black ml-1">Date</label><input value={date} onChange={e=>setDate(e.target.value)} className="w-full bg-black/30 p-3 rounded-2xl border border-[#22c55e]/20 outline-none"/></div>
        </div>
      </div>

      <div className="bg-white/[0.03] p-6 rounded-[2rem] border border-[#22c55e]/20 mb-5">
        <div className="flex bg-black/40 rounded-xl border border-[#22c55e]/20 overflow-hidden w-fit mb-4">
          <button onClick={() => upd('sizeUnit', 'mm')} className={`px-6 py-2 text-xs font-bold transition ${form.sizeUnit === 'mm' ? 'bg-[#22c55e] text-black' : 'text-gray-400'}`}>Millimeter (mm)</button>
          <button onClick={() => upd('sizeUnit', 'inch')} className={`px-6 py-2 text-xs font-bold transition ${form.sizeUnit === 'inch' ? 'bg-[#22c55e] text-black' : 'text-gray-400'}`}>Inches (")</button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          {form.sizeUnit === 'mm' ? <SelectOrCustom value={form.sizeMm} onChange={v => upd('sizeMm', v)} options={SIZE_MM} placeholder="Select mm"/> : <SelectOrCustom value={form.sizeInch} onChange={v => upd('sizeInch', v)} options={SIZE_INCH} placeholder="Select inch"/>}
          <SelectOrCustom value={form.yards} onChange={v => upd('yards', v)} options={YARDS_LIST} placeholder="Yards"/>
          <SelectOrCustom value={form.colour} onChange={v => upd('colour', v)} options={COLOURS} placeholder="Colour"/>
          <SelectOrCustom value={form.brand} onChange={v => upd('brand', v)} options={BRANDS} placeholder="Brand"/>
          <SelectOrCustom value={form.micron} onChange={v => upd('micron', v)} options={MICRONS} placeholder="Micron"/>
          <input type="number" placeholder="Total CTN" value={form.totalCarton} onChange={e => upd('totalCarton', e.target.value)} className="bg-black/30 p-3 rounded-xl border border-[#22c55e]/20 text-sm outline-none"/>
          <input type="number" placeholder="Rolls P.CTN" value={form.perCtnQty} onChange={e => upd('perCtnQty', e.target.value)} className="bg-black/30 p-3 rounded-xl border border-[#22c55e]/20 text-sm outline-none"/>
          <input type="number" placeholder="Rate" value={form.rate} onChange={e => upd('rate', e.target.value)} className="bg-black/30 p-3 rounded-xl border border-[#22c55e]/20 text-sm outline-none"/>
        </div>
        <button onClick={addItem} className="bg-[#22c55e] text-black font-black px-8 py-3 rounded-2xl flex items-center gap-2 hover:bg-emerald-400 transition text-xs uppercase tracking-widest"><Plus size={16}/> Add to List</button>
      </div>

      <div className="bg-yellow-500/5 p-5 rounded-[2rem] border border-yellow-500/20 mb-5">
        <p className="text-[10px] text-yellow-500 uppercase font-black tracking-widest mb-3 flex items-center gap-2"><Box size={14}/> Stock Sync (Internal Carton Use)</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <select value={carton.brand} onChange={e => updC('brand', e.target.value)} className="bg-black/30 p-3 rounded-xl border border-yellow-500/10 text-sm outline-none"><option value="">Select Brand</option>{CARTON_BRANDS.map(b => <option key={b} value={b}>{b}</option>)}</select>
          <select value={carton.type} onChange={e => updC('type', e.target.value)} className="bg-black/30 p-3 rounded-xl border border-yellow-500/10 text-sm outline-none"><option value="Small">Small</option><option value="Large">Large</option></select>
          <select value={carton.size} onChange={e => updC('size', e.target.value)} className="bg-black/30 p-3 rounded-xl border border-yellow-500/10 text-sm outline-none">{CARTON_SIZES.map(s => <option key={s} value={s}>{s}"</option>)}</select>
          <input type="number" value={carton.qty} onChange={e => updC('qty', e.target.value)} placeholder="Qty" className="bg-black/30 p-3 rounded-xl border border-yellow-500/10 text-sm outline-none"/>
        </div>
      </div>

      <div className="bg-white/[0.02] rounded-[2rem] border border-white/5 overflow-hidden mb-8">
        <table className="w-full text-left">
          <thead className="bg-white/5 text-[10px] uppercase font-black text-slate-500"><tr><th className="p-5">#</th><th>Description</th><th className="text-center">CTN</th><th className="text-center">Total Qty</th><th className="text-right">Rate</th><th className="text-right p-5">Amount</th><th className="p-5"></th></tr></thead>
          <tbody className="divide-y divide-white/5">
            {rows.map((r, i) => (
              <tr key={r.id} className="hover:bg-white/5 transition"><td className="p-5 text-gray-500">{i+1}</td><td><p className="font-bold">{r.brand} - {r.colour}</p><p className="text-[10px] text-gray-500 uppercase">{r.sizeLabel}</p></td><td className="text-center font-bold">{r.totalCarton}</td><td className="text-center text-emerald-500 font-bold">{r.totalQty}</td><td className="text-right font-mono text-xs">{r.rate.toLocaleString()}</td><td className="text-right font-black text-white p-5">{r.total.toLocaleString()}</td><td className="p-5"><button onClick={() => removeRow(r.id)} className="text-gray-600 hover:text-red-500 transition"><Trash2 size={16}/></button></td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white/[0.03] p-6 rounded-[2rem] border border-white/5 flex flex-col justify-center"><p className="text-[10px] uppercase font-black text-gray-500 tracking-widest mb-2">In Words</p><p className="text-sm font-bold text-slate-300 italic">"{toWords(grandTotal)}"</p></div>
        <div className="bg-emerald-500 p-6 rounded-[2rem] flex items-center justify-between shadow-2xl"><div className="text-emerald-950">
          <p className="text-[10px] uppercase font-black tracking-widest opacity-60">Grand Total Payable</p>
          <p className="text-xs font-bold">{totalCartonCount} Cartons Total</p></div>
          <p className="text-4xl font-black text-emerald-950 tracking-tighter">Rs. {grandTotal.toLocaleString()}</p></div>
      </div>
    </div>
  );
};

export default SaleInvoice;
