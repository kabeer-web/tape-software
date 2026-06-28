import { useState, useRef, useContext, useEffect, useMemo } from 'react';
import { 
  Plus, Trash2, Printer, Upload, X, CheckCircle2, Box, Database, Search, AlertTriangle, FileText 
} from 'lucide-react';
import { useAccounts } from '../ACCOUNTS/AccountsContext';
import { StockContext } from '../StockContext';

// ── NUMBERS TO WORDS (Wahi Logic) ────────────────────────
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

// ── CONSTANTS ─────────────────────────────────────────────
const ADDR  = 'PLOT #356-5, SECTOR 5-B, SAEEDABAD BALDIA TOWN S.I.T.E KARACHI';
const PHONE = 'Phone: 0313-2400511 & 0308-7058453';
const COLOURS = ['Clear','Tan','Cloth','Masking','Tissue','Super Yellow','Super Clear','Color','Foam','Black','White','Brown','Silver'];
const BRANDS  = ['Tesco','Bell','Race','Jhonson','HS Packages','Local','Imported'];
const MICRONS = ['37μ','39μ','40μ','42μ','43μ','44μ','45μ','48μ'];
const SIZE_MM = ['720','900','1280','1600','2400'];
const SIZE_INCH = ['1/2"','1"','2"','3"','4"','6"'];
const CARTON_SIZES = ['10','10.5','11','12'];

// ── SELECT OR CUSTOM COMPONENT ─────────────────────────────
const SelectOrCustom = ({ value, onChange, options, placeholder }) => {
  const isCustom = value !== '' && !options.includes(value);
  const [custom, setCustom] = useState(isCustom);
  const handleSelect = (v) => { if (v === '__custom__') { setCustom(true); onChange(''); } else { setCustom(false); onChange(v); } };
  return (
    <div className="flex flex-col gap-1">
      <select value={custom ? '__custom__' : value} onChange={e => handleSelect(e.target.value)} className="bg-black/30 p-2.5 rounded-xl border border-white/10 outline-none text-sm focus:border-emerald-500 transition-all font-bold">
        <option value="">{placeholder}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
        <option value="__custom__">✏️ Custom...</option>
      </select>
      {custom && <input autoFocus value={value} onChange={e => onChange(e.target.value)} placeholder="Type value..." className="bg-black/40 p-2 rounded-xl border border-emerald-500/50 outline-none text-sm text-white mt-1" />}
    </div>
  );
};

// ── PREMIUM PRINT HTML GENERATOR ────────────────────────────
const generateInvoiceHTML = (bill) => {
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
  *{margin:0;padding:0;box-sizing:border-box; font-family:'Segoe UI', sans-serif;}
  body{padding:40px; color:#000; background:#fff; line-height:1.2;}
  .hdr{display:flex; justify-content:space-between; align-items:center; border-bottom:4px solid #000; padding-bottom:15px; margin-bottom:25px;}
  .logo-area{display:flex; align-items:center; gap:20px;}
  .co-name{font-size:28px; font-weight:900; text-transform:uppercase;}
  .co-info{font-size:10px; color:#333; margin-top:8px;}
  .meta-grid{display:grid; grid-template-columns:1.5fr 1fr; gap:30px; margin-bottom:25px;}
  .buyer-box{border:3px solid #000; padding:15px;}
  .main-table{width:100%; border-collapse:collapse; margin-bottom:25px; border:2px solid #000;}
  th{background:#000; color:#fff; padding:12px 5px; font-size:9px; text-transform:uppercase; border:1px solid #000;}
  .total-box{width:320px; border:5px solid #000; padding:20px; text-align:right;}
  .total-val{font-size:32px; font-weight:900;}
  .sig-line{border-top:2px solid #000; text-align:center; padding-top:10px; font-weight:bold; font-size:11px; text-transform:uppercase;}
</style></head><body>
<div class="hdr">
  <div class="logo-area">${logoImgHtml}<div><span class="co-name">HS PACKAGES</span><div class="co-info">${ADDR}<br/>${PHONE}</div></div></div>
  <div style="text-align:right"><h1>INVOICE</h1><strong>No: #${billNo}</strong><br/>Date: ${date}</div>
</div>
<div class="meta-grid">
  <div class="buyer-box">Bill To:<br/><div style="font-size:22px; font-weight:900;">${partyName}</div></div>
  <div style="text-align:right">Total Cartons: <strong>${Number(totalCartonCount)}</strong></div>
</div>
<table class="main-table">
  <thead><tr><th>#</th><th>Description</th><th>Color</th><th>Brand</th><th>MIC</th><th>CTN</th><th>P.Qty</th><th>Total</th><th>Rate</th><th>Amount</th></tr></thead>
  <tbody>${rowsHtml}</tbody>
</table>
<div style="display:flex; justify-content:space-between; gap:30px;">
  <div style="flex:1; border:1px solid #ccc; padding:15px; border-radius:4px;">Amount in Words:<br/><strong>${toWords(grandTotal)}</strong></div>
  <div class="total-box">Grand Total:<div class="total-val">Rs. ${grandTotal.toLocaleString()}</div></div>
</div>
<div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:50px; margin-top:100px;">
  <div class="sig-line">Prepared By</div><div class="sig-line">Receiver's Sign</div><div class="sig-line">Authorized Signatory</div>
</div>
<script>window.onload=()=>{window.print();window.onafterprint=()=>window.close();}</script>
</body></html>`;
};

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

  // Form State (Baki ki bachi hui details restored!)
  const [form, setForm] = useState({
    sizeUnit: 'mm',
    sizeMm: '',
    sizeInch: '',
    yards: '',
    colour: '',
    brand: '',
    micron: '',
    totalCarton: '',
    perCtnQty: '',
    rate: '',
    cartonType: 'Small', // Dedicated for inventory matching
    cartonSize: '10'    // Dedicated for inventory matching
  });

  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // ── LIVE STOCK SEARCH LOGIC (Silent Background Link) ──
  const matchedStock = useMemo(() => {
    if (!form.brand || !form.cartonSize) return null;
    return inventory.find(i => 
      i.category === 'Carton' && 
      String(i.brand).toLowerCase() === String(form.brand).toLowerCase() && 
      (i.carton_type || i.type) === form.cartonType &&
      parseFloat(i.size) === parseFloat(form.cartonSize)
    );
  }, [form.brand, form.cartonType, form.cartonSize, inventory]);

  const addItem = () => {
    if (!form.totalCarton || !form.rate) return;
    const tc = parseFloat(form.totalCarton);
    const pc = parseFloat(form.perCtnQty || 0);
    const sizeLabel = [
      form.sizeUnit === 'mm' ? `${form.sizeMm}mm` : `${form.sizeInch}"`,
      form.yards ? `${form.yards}yds` : ''
    ].filter(Boolean).join(' / ');

    setRows(p => [...p, { 
      id: Date.now(), 
      ...form, 
      sizeLabel, 
      inventoryId: matchedStock?._id || matchedStock?.id, // ID capture for deduction
      totalQty: tc * pc, 
      total: (tc * pc) * parseFloat(form.rate) 
    }]);
    
    // Clear only entry fields
    setForm(prev => ({...prev, totalCarton: '', yards: '', rate: '', perCtnQty: ''}));
  };

  const handleSave = async () => {
    if (!billNo || !buyerName || rows.length === 0) return;
    setSaving(true);
    try {
      // 1. Save Bill to Account History
      await saveBill({ 
        billType: 'Sale', 
        billNo, 
        partyName: buyerName, 
        date, 
        items: rows, 
        grandTotal: rows.reduce((s,r)=>s+r.total,0), 
        totalCartonCount: rows.reduce((s,r)=>s+Number(r.totalCarton),0), 
        logo 
      });

      // 2. Auto Deduction loop (Sab items minus honge)
      for (const row of rows) {
        if (row.inventoryId) {
          await updateStock(row.inventoryId, -Number(row.totalCarton));
        }
      }

      setPopMsg(`✅ Bill #${billNo} Saved & Inventory Deducted!`);
      setTimeout(() => setPopMsg(''), 6000);
      setRows([]); setBillNo(''); setBuyerName('');
      refreshInventory();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const grandTotal = rows.reduce((s, r) => s + r.total, 0);
  const totalCartonCount = rows.reduce((s, r) => s + (Number(r.totalCarton) || 0), 0);

  return (
    <div className="text-white min-h-screen pb-10 max-w-7xl mx-auto px-4 font-sans">
      
      {/* Pop-up Notification */}
      {popMsg && (
        <div className="fixed top-10 right-10 z-50 bg-[#10b981] text-black p-5 rounded-2xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-right duration-500 border border-white/20">
           <div className="bg-black/20 p-2 rounded-full"><CheckCircle2 size={24}/></div>
           <p className="font-bold text-sm">{popMsg}</p>
           <button onClick={()=>setPopMsg('')}><X size={18}/></button>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-8 pt-8">
        <div>
          <h1 className="text-4xl font-black italic text-[#10b981]">HS <span className="text-white">PACKAGES</span></h1>
          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">Smart Invoicing & Auto-Inventory</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleSave} disabled={saving || rows.length === 0} className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-6 py-3 rounded-2xl font-black text-xs hover:bg-emerald-500 hover:text-black transition-all">SAVE TO DB</button>
          <button onClick={() => {const h = generateInvoiceHTML({billNo, partyName:buyerName, date, items:rows, grandTotal, totalCartonCount, logo}); const w = window.open('','_blank'); w.document.write(h); w.document.close();}} className="bg-emerald-500 text-black px-6 py-3 rounded-2xl font-black text-xs hover:scale-105 transition-all shadow-[0_0_20px_rgba(34,197,94,0.3)]"><Printer size={16}/> PRINT</button>
        </div>
      </div>

      {/* Meta Card (Logo restored!) */}
      <div className="bg-white/[0.03] border border-white/10 p-8 rounded-[2.5rem] mb-6 flex flex-col md:flex-row gap-8 items-center backdrop-blur-xl">
        <div className="shrink-0 text-center">
          {logo ? (
            <div className="relative group"><img src={logo} className="h-24 w-auto object-contain rounded-xl border border-white/10 p-2 bg-black/20"/><button onClick={()=>setLogo(null)} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1"><X size={12}/></button></div>
          ) : (
            <button onClick={()=>fileRef.current?.click()} className="w-28 h-24 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center text-gray-500 hover:border-[#10b981] hover:text-[#10b981] transition-all"><Upload size={24}/><span className="text-[8px] font-black mt-1 uppercase">Select Logo</span></button>
          )}
          <input ref={fileRef} type="file" accept="image/*" onChange={(e)=>{const rd=new FileReader(); rd.onload=()=>setLogo(rd.result); rd.readAsDataURL(e.target.files[0]);}} className="hidden"/>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 w-full text-white font-bold">
          <div className="space-y-1"><label className="text-[10px] text-gray-500 uppercase font-black ml-2">Invoice #</label><input value={billNo} onChange={e=>setBillNo(e.target.value)} placeholder="001" className="w-full bg-black/40 p-4 rounded-2xl border border-white/5 outline-none focus:border-emerald-500"/></div>
          <div className="space-y-1"><label className="text-[10px] text-gray-500 uppercase font-black ml-2">Customer</label><input value={buyerName} onChange={e=>setBuyerName(e.target.value)} placeholder="Party Name" className="w-full bg-black/40 p-4 rounded-2xl border border-white/5 outline-none focus:border-emerald-500"/></div>
          <div className="space-y-1"><label className="text-[10px] text-gray-500 uppercase font-black ml-2">Date</label><input value={date} onChange={e=>setDate(e.target.value)} className="w-full bg-black/40 p-4 rounded-2xl border border-white/5 outline-none font-bold text-slate-400"/></div>
        </div>
      </div>

      {/* Main Form & Link Status */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 bg-white/[0.03] border border-white/10 p-8 rounded-[2.5rem] shadow-xl">
             <div className="flex bg-black/40 p-1 rounded-2xl border border-white/5 w-fit mb-6">
                <button onClick={() => upd('sizeUnit', 'mm')} className={`px-8 py-2.5 text-[10px] font-black uppercase rounded-xl transition-all ${form.sizeUnit === 'mm' ? 'bg-[#10b981] text-black' : 'text-gray-500'}`}>MM</button>
                <button onClick={() => upd('sizeUnit', 'inch')} className={`px-8 py-2.5 text-[10px] font-black uppercase rounded-xl transition-all ${form.sizeUnit === 'inch' ? 'bg-[#10b981] text-black' : 'text-gray-500'}`}>Inches</button>
             </div>

             <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {form.sizeUnit === 'mm' ? <SelectOrCustom value={form.sizeMm} onChange={v=>upd('sizeMm',v)} options={SIZE_MM} placeholder="Size MM"/> : <SelectOrCustom value={form.sizeInch} onChange={v=>upd('sizeInch',v)} options={SIZE_INCH} placeholder="Size INCH"/>}
                <SelectOrCustom value={form.yards} onChange={v=>upd('yards',v)} options={['40','50','80','100','150','200']} placeholder="Yards"/>
                <SelectOrCustom value={form.colour} onChange={v=>upd('colour',v)} options={COLOURS} placeholder="Colour"/>
                <SelectOrCustom value={form.brand} onChange={v=>upd('brand',v)} options={BRANDS} placeholder="Brand"/>
                <SelectOrCustom value={form.micron} onChange={v=>upd('micron',v)} options={MICRONS} placeholder="Micron"/>
                <input type="number" placeholder="Rate" value={form.rate} onChange={e=>upd('rate',e.target.value)} className="bg-black/40 p-3 rounded-xl border border-white/10 outline-none text-white font-bold"/>
                <input type="number" placeholder="Total CTN" value={form.totalCarton} onChange={e=>upd('totalCarton',e.target.value)} className="bg-black/40 p-3 rounded-xl border border-white/10 outline-none text-white font-bold"/>
                <input type="number" placeholder="P/CTN Qty" value={form.perCtnQty} onChange={e=>upd('perCtnQty',e.target.value)} className="bg-black/40 p-3 rounded-xl border border-white/10 outline-none text-white font-bold"/>
             </div>

             {/* Stock Link Helper (Automatically matches as you type/select brand) */}
             <div className="flex flex-wrap gap-4 items-center bg-black/20 p-4 rounded-2xl border border-white/5">
                <p className="text-[10px] font-black uppercase text-gray-500">Stock Matching:</p>
                <select value={form.cartonType} onChange={e=>upd('cartonType',e.target.value)} className="bg-transparent text-xs font-bold border-b border-white/10 outline-none"><option value="Small">Small</option><option value="Large">Large</option></select>
                <select value={form.cartonSize} onChange={e=>upd('cartonSize',e.target.value)} className="bg-transparent text-xs font-bold border-b border-white/10 outline-none">{CARTON_SIZES.map(s=><option key={s} value={s}>{s}"</option>)}</select>
                <button onClick={addItem} className="ml-auto bg-[#10b981] text-black font-black px-10 py-3 rounded-xl hover:scale-105 transition-all flex items-center gap-2 text-xs uppercase tracking-widest"><Plus size={18}/> ADD TO LIST</button>
             </div>
          </div>

          {/* Live Stock Monitor (Restored visual) */}
          <div className={`p-8 rounded-[2.5rem] border-2 transition-all flex flex-col justify-center items-center text-center ${matchedStock ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/10'}`}>
              <div className={`p-4 rounded-3xl mb-4 ${matchedStock ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                {matchedStock ? <Database size={32}/> : <AlertTriangle size={32}/>}
              </div>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Inventory Linked</p>
              {matchedStock ? (
                <>
                  <p className="text-4xl font-black text-white mt-2">{matchedStock.qty}</p>
                  <p className="text-[10px] font-bold text-emerald-500 uppercase">Available Cartons</p>
                </>
              ) : (
                <p className="text-xs font-bold text-red-400 mt-2">No Matching<br/>Stock Found</p>
              )}
          </div>
      </div>

      {/* Rows Table */}
      <div className="bg-white/[0.01] border border-white/5 rounded-[2.5rem] overflow-hidden mt-8 shadow-inner">
        <table className="w-full text-left">
          <thead className="bg-white/5 text-[10px] font-black text-gray-500 uppercase tracking-widest"><tr><th className="p-6">Description</th><th className="text-center">CTN</th><th className="text-center">Rolls</th><th className="text-right">Rate</th><th className="text-right p-6">Amount</th><th className="p-6"></th></tr></thead>
          <tbody className="divide-y divide-white/5">
            {rows.map(r => (
              <tr key={r.id} className="hover:bg-white/5 transition-all">
                <td className="p-6 font-bold text-white uppercase">
                  {r.brand} - {r.colour} <small className="text-gray-500">({r.micron})</small>
                  <p className="text-[10px] text-gray-500 font-black mt-1 uppercase italic">{r.sizeLabel}</p>
                  {r.inventoryId && <span className="text-[8px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-md">LINKED ✓</span>}
                </td>
                <td className="text-center font-black text-[#10b981] text-2xl">{r.totalCarton}</td>
                <td className="text-center text-gray-400 font-bold">{r.totalQty} <small className="text-[8px] opacity-40 uppercase">PCS</small></td>
                <td className="text-right text-gray-300 font-mono">{Number(r.rate).toLocaleString()}</td>
                <td className="text-right font-black text-white text-2xl p-6">Rs. {r.total.toLocaleString()}</td>
                <td className="p-6 text-right"><button onClick={()=>setRows(rows.filter(x=>x.id!==r.id))} className="text-red-500/20 p-2 rounded-lg hover:bg-red-500 hover:text-white transition-all"><Trash2 size={16}/></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary Footer */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] flex flex-col justify-center"><p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Amount In Words</p><p className="text-sm font-black text-slate-400 italic">"${toWords(grandTotal)}"</p></div>
        <div className="bg-[#10b981] p-8 rounded-[3rem] flex items-center justify-between shadow-2xl text-emerald-950 font-black uppercase">
          <div className="leading-tight"><span className="opacity-60 text-xs font-bold">Total Dispatch</span><p className="text-lg">{totalCartonCount} Units</p></div>
          <p className="text-5xl tracking-tighter">Rs. {grandTotal.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
};

export default SaleInvoice;
