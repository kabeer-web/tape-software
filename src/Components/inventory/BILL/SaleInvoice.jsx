import { useState, useRef, useContext, useEffect, useMemo } from 'react';
import {
  Plus, Trash2, Printer, Upload, X, CheckCircle2, Database,
  AlertTriangle, ChevronDown, FileDown
} from 'lucide-react';
import { useAccounts } from '../ACCOUNTS/AccountsContext';
import { StockContext } from '../StockContext';
import { getLedgerEntries } from '../../../api';

// ── NUMBERS TO WORDS LOGIC ────────────────────────
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

// ── SELECT OR CUSTOM ─────────────────────────────
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

// ── PARTY PICKER — searchable dropdown, free typing bhi chalta hai ──
const PartyPicker = ({ value, onChange, options, placeholder, onSelect, onBlur }) => {
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    const onClick = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const filtered = (value || '').trim() === ''
    ? options
    : options.filter(o => o.toLowerCase().includes(value.toLowerCase()));
  const exactMatch = options.some(o => o.toLowerCase() === (value || '').trim().toLowerCase());

  return (
    <div className="relative" ref={boxRef}>
      <div className="relative">
        <input
          value={value}
          onChange={e => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => { if (onBlur) onBlur(value); }}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full bg-black/40 p-4 rounded-2xl border border-white/5 outline-none focus:border-emerald-500 text-white font-bold pr-10"
        />
        <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
      </div>
      {open && (
        <div className="absolute z-30 mt-1.5 w-full max-h-56 overflow-y-auto bg-[#0c0c0c] border border-[#22c55e]/30 rounded-xl shadow-2xl">
          {filtered.length === 0 && (
            <p className="px-4 py-3 text-xs text-gray-500">Koi party nahi mili</p>
          )}
          {filtered.map(o => (
            <button
              key={o} type="button"
              onMouseDown={() => { onChange(o); onSelect && onSelect(o); setOpen(false); }}
              className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-[#22c55e]/10 hover:text-[#22c55e] transition border-b border-white/5 last:border-0"
            >
              {o}
            </button>
          ))}
          {value && !exactMatch && (
            <div className="px-4 py-2.5 text-xs text-yellow-500 bg-yellow-500/5 border-t border-white/5">
              ✏️ "{value}" naye party ke taur par save hogi
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const SaleInvoice = () => {
  const { saveBill } = useAccounts();
  const { inventory, updateStock, refreshInventory } = useContext(StockContext);

  const [billNo, setBillNo] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [date, setDate] = useState(new Date().toLocaleDateString('en-GB'));
  const [rows, setRows] = useState([]);
  
  // Persistence for Logo
  const [logo, setLogo] = useState(() => localStorage.getItem('erp_invoice_logo') || null);
  
  const [popMsg, setPopMsg] = useState('');
  const [popOk, setPopOk] = useState(true);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  const [partyBalance, setPartyBalance] = useState(null);
  const [balanceLoading, setBalanceLoading] = useState(false);

  const [form, setForm] = useState({
    sizeUnit: 'mm', sizeMm: '', sizeInch: '', yards: '', colour: '', brand: '', micron: '', totalCarton: '', perCtnQty: '', rate: '', cartonType: 'Small', cartonSize: '10'
  });

  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const flash = (text, ok = true) => {
    setPopMsg(text); setPopOk(ok);
    setTimeout(() => setPopMsg(''), 6000);
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setLogo(reader.result);
      localStorage.setItem('erp_invoice_logo', reader.result);
    };
    reader.readAsDataURL(file);
  };

  const fetchPartyBalance = async (name) => {
    if (!name || !name.trim()) { setPartyBalance(null); return; }
    setBalanceLoading(true);
    try {
      const entries = await getLedgerEntries(name.trim());
      const totalDebit  = entries.filter(e => e.entry_type === 'debit' ).reduce((s,e)=>s+(Number(e.amount)||0),0);
      const totalCredit = entries.filter(e => e.entry_type === 'credit').reduce((s,e)=>s+(Number(e.amount)||0),0);
      setPartyBalance({ totalDebit, totalCredit, balance: totalDebit - totalCredit, count: entries.length });
    } catch (err) {
      console.error('fetchPartyBalance error:', err);
      setPartyBalance(null);
    } finally {
      setBalanceLoading(false);
    }
  };

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
    if (!form.totalCarton || !form.rate) { flash('❌ Total Carton aur Rate zaroori hai', false); return; }
    const tc = parseFloat(form.totalCarton);
    const pc = parseFloat(form.perCtnQty || 0);
    const sizeLabel = [
      form.sizeUnit === 'mm' ? `${form.sizeMm}mm` : `${form.sizeInch}"`,
      form.yards ? `${form.yards}yds` : ''
    ].filter(Boolean).join(' / ');

    setRows(p => [...p, { 
      id: Date.now(), ...form, sizeLabel, 
      inventoryId: matchedStock?._id || matchedStock?.id, 
      totalQty: tc * pc, total: (tc * pc) * parseFloat(form.rate) 
    }]);
    setForm(prev => ({...prev, totalCarton: '', yards: '', rate: '', perCtnQty: ''}));
  };

  const handleSave = async () => {
    if (!billNo.trim())    { flash('❌ Invoice number daalein',  false); return; }
    if (!buyerName.trim()) { flash('❌ Party select/likhein',   false); return; }
    if (rows.length === 0) { flash('❌ Pehle koi item add karein', false); return; }

    setSaving(true);
    try {
      await saveBill({
        billType: 'Sale', billNo, partyName: buyerName, date, items: rows,
        grandTotal: rows.reduce((s,r)=>s+r.total,0),
        totalCartonCount: rows.reduce((s,r)=>s+Number(r.totalCarton),0),
        logo
      });

      for (const row of rows) {
        if (row.inventoryId) { await updateStock(row.inventoryId, -Number(row.totalCarton)); }
      }

      flash(`✅ Bill #${billNo} Saved! Ledger aur Inventory update ho gaye.`);
      setRows([]); setBillNo(''); setBuyerName(''); setPartyBalance(null);
      refreshInventory();
    } catch (err) {
      flash('❌ Error: ' + err.message, false);
    } finally {
      setSaving(false);
    }
  };

  const handleSavePDF = () => {
    const grandTotal = rows.reduce((s, r) => s + r.total, 0);
    const totalCartonCount = rows.reduce((s, r) => s + (Number(r.totalCarton) || 0), 0);
    
    const rowsHtml = rows.map((r, i) => `
      <tr>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${i + 1}</td>
        <td style="border: 1px solid #ddd; padding: 8px;">
          <strong>${r.brand} - ${r.colour}</strong><br/>
          <small>${r.sizeLabel} | ${r.micron || ''}</small>
        </td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${r.totalCarton}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${r.totalQty}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${Number(r.rate).toLocaleString()}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${r.total.toLocaleString()}</td>
      </tr>
    `).join('');

    const html = `
      <html>
        <head>
          <title>Invoice #${billNo}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #111; }
            .header { display: flex; justify-content: space-between; border-bottom: 3px solid #10b981; padding-bottom: 20px; }
            .logo { height: 80px; width: auto; }
            .company-info h1 { margin: 0; color: #10b981; }
            .company-info p { margin: 2px 0; font-size: 10px; color: #666; }
            .invoice-details { margin-top: 30px; display: flex; justify-content: space-between; }
            .invoice-details div { border: 1px solid #eee; padding: 15px; border-radius: 10px; flex: 1; margin: 0 5px; }
            table { width: 100%; border-collapse: collapse; margin-top: 30px; }
            th { background: #10b981; color: white; padding: 10px; }
            .total-section { margin-top: 30px; text-align: right; }
            .total-box { display: inline-block; background: #10b981; color: white; padding: 20px; border-radius: 15px; }
            .words { margin-top: 20px; font-style: italic; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-info">
              ${logo ? `<img src="${logo}" class="logo" />` : '<h1>HS PACKAGES</h1>'}
              <p>${ADDR}</p>
              <p>${PHONE}</p>
            </div>
            <div style="text-align: right;">
              <h2 style="margin: 0; font-size: 40px; opacity: 0.1;">INVOICE</h2>
              <p><strong>No:</strong> #${billNo}</p>
              <p><strong>Date:</strong> ${date}</p>
            </div>
          </div>
          <div class="invoice-details">
            <div><strong>BILL TO:</strong><br/>${buyerName}</div>
            <div style="text-align: right;"><strong>DISPATCH:</strong><br/>${totalCartonCount} Cartons</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>#</th><th>Product Description</th><th>CTN</th><th>Rolls</th><th>Rate</th><th>Amount</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
          <div class="words">Amount in words: ${toWords(grandTotal)}</div>
          <div class="total-section">
            <div class="total-box">
              <small>GRAND TOTAL</small><br/>
              <span style="font-size: 24px; font-weight: bold;">Rs. ${grandTotal.toLocaleString()}</span>
            </div>
          </div>
          <div style="margin-top: 80px; display: flex; justify-content: space-between;">
             <div style="border-top: 1px solid #000; width: 200px; text-align: center;">Receiver Signature</div>
             <div style="border-top: 1px solid #000; width: 200px; text-align: center;">Authorized Signature</div>
          </div>
        </body>
      </html>
    `;
    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 500);
  };

  const grandTotal = rows.reduce((s, r) => s + r.total, 0);
  const totalCartonCount = rows.reduce((s, r) => s + (Number(r.totalCarton) || 0), 0);

  return (
    <div className="text-white min-h-screen pb-10 max-w-7xl mx-auto px-4 font-sans">
      {popMsg && (
        <div className={`fixed top-10 right-10 z-50 p-5 rounded-2xl shadow-2xl flex items-center gap-4 border animate-in slide-in-from-right ${popOk ? 'bg-[#10b981] text-black border-white/20' : 'bg-red-500 text-white border-white/20'}`}>
           <div className="bg-black/20 p-2 rounded-full"><CheckCircle2 size={24}/></div>
           <p className="font-bold text-sm">{popMsg}</p>
           <button onClick={()=>setPopMsg('')}><X size={18}/></button>
        </div>
      )}

      <div className="flex justify-between items-center mb-8 pt-8">
        <div>
          <h1 className="text-4xl font-black italic text-[#10b981]">HS <span className="text-white">PACKAGES</span></h1>
          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">Smart Invoicing & Auto-Inventory</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleSave} disabled={saving || rows.length === 0} className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-6 py-3 rounded-2xl font-black text-xs hover:bg-emerald-500 hover:text-black transition-all disabled:opacity-30">
            {saving ? 'SAVING...' : 'SAVE TO DB'}
          </button>
          
          {/* New Save as PDF Button */}
          <button onClick={handleSavePDF} disabled={rows.length === 0} className="bg-white/10 text-white px-6 py-3 rounded-2xl font-black text-xs hover:bg-white/20 transition-all flex items-center gap-2">
            <FileDown size={16}/> SAVE PDF
          </button>

          <button onClick={() => {}} disabled={rows.length===0} className="bg-emerald-500 text-black px-6 py-3 rounded-2xl font-black text-xs hover:scale-105 transition-all shadow-[0_0_20px_rgba(34,197,94,0.3)] flex items-center gap-2 disabled:opacity-30"><Printer size={16}/> PRINT</button>
        </div>
      </div>

      <div className="bg-white/[0.03] border border-white/10 p-8 rounded-[2.5rem] mb-6 flex flex-col md:flex-row gap-8 items-center backdrop-blur-xl">
        <div className="shrink-0 text-center">
          {logo ? (
            <div className="relative group"><img src={logo} className="h-24 w-auto object-contain rounded-xl border border-white/10 p-2 bg-black/20"/><button onClick={()=>{setLogo(null); localStorage.removeItem('erp_invoice_logo');}} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1"><X size={12}/></button></div>
          ) : (
            <button onClick={()=>fileRef.current?.click()} className="w-28 h-24 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center text-gray-500 hover:border-[#10b981] hover:text-[#10b981] transition-all"><Upload size={24}/><span className="text-[8px] font-black mt-1 uppercase">Insert Logo</span></button>
          )}
          <input ref={fileRef} type="file" accept="image/*" onChange={handleLogoChange} className="hidden"/>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 w-full text-white font-bold">
          <div className="space-y-1">
            <label className="text-[10px] text-gray-500 uppercase font-black ml-2">Invoice #</label>
            <input value={billNo} onChange={e=>setBillNo(e.target.value)} placeholder="001" className="w-full bg-black/40 p-4 rounded-2xl border border-white/5 outline-none focus:border-emerald-500"/>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-gray-500 uppercase font-black ml-2">Customer</label>
            <PartyPicker
              value={buyerName}
              onChange={setBuyerName}
              options={SALE_PARTIES}
              placeholder="Party select karein ya naya likhein"
              onSelect={fetchPartyBalance}
              onBlur={fetchPartyBalance}
            />
            {balanceLoading && <p className="text-[10px] text-gray-500 mt-1.5 ml-1">Balance check ho raha hai...</p>}
            {!balanceLoading && partyBalance && (
              <div className={`mt-1.5 inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg ${
                partyBalance.balance > 0 ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                : partyBalance.balance < 0 ? 'bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20'
                : 'bg-white/5 text-gray-400 border border-white/10'
              }`}>
                {partyBalance.balance > 0
                  ? `Purana Balance: ${partyBalance.balance.toLocaleString()} DR (Lena hai)`
                  : partyBalance.balance < 0
                    ? `Purana Balance: ${Math.abs(partyBalance.balance).toLocaleString()} CR (Dena hai)`
                    : 'Purana Balance: Clear'}
              </div>
            )}
          </div>
          <div className="space-y-1"><label className="text-[10px] text-gray-500 uppercase font-black ml-2">Date</label><input value={date} onChange={e=>setDate(e.target.value)} className="w-full bg-black/40 p-4 rounded-2xl border border-white/5 outline-none font-bold text-slate-400"/></div>
        </div>
      </div>

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
             <div className="flex flex-wrap gap-4 items-center bg-black/20 p-4 rounded-2xl border border-white/5">
                <p className="text-[10px] font-black uppercase text-gray-500">Stock Matching:</p>
                <select value={form.cartonType} onChange={e=>upd('cartonType',e.target.value)} className="bg-transparent text-xs font-bold border-b border-white/10 outline-none"><option value="Small">Small</option><option value="Large">Large</option></select>
                <select value={form.cartonSize} onChange={e=>upd('cartonSize',e.target.value)} className="bg-transparent text-xs font-bold border-b border-white/10 outline-none">{CARTON_SIZES.map(s=><option key={s} value={s}>{s}"</option>)}</select>
                <button onClick={addItem} className="ml-auto bg-[#10b981] text-black font-black px-10 py-3 rounded-xl hover:scale-105 transition-all flex items-center gap-2 text-xs uppercase tracking-widest"><Plus size={18}/> ADD TO LIST</button>
             </div>
          </div>
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

      <div className="bg-white/[0.01] border border-white/5 rounded-[2.5rem] overflow-hidden mt-8 shadow-inner">
        <table className="w-full text-left">
          <thead className="bg-white/5 text-[10px] font-black text-gray-500 uppercase tracking-widest"><tr><th className="p-6">Description</th><th className="text-center">CTN</th><th className="text-center">Rolls</th><th className="text-right">Rate</th><th className="text-right p-6">Amount</th><th className="p-6"></th></tr></thead>
          <tbody className="divide-y divide-white/5">
            {rows.length === 0 ? (
              <tr><td colSpan={6} className="p-10 text-center text-gray-600">Koi item add nahi hua.</td></tr>
            ) : rows.map(r => (
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] flex flex-col justify-center"><p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Amount In Words</p><p className="text-sm font-black text-slate-400 italic">"{toWords(grandTotal)}"</p></div>
        <div className="bg-[#10b981] p-8 rounded-[3rem] flex items-center justify-between shadow-2xl text-emerald-950 font-black uppercase">
          <div className="leading-tight"><span className="opacity-60 text-xs font-bold">Total Dispatch</span><p className="text-lg">{totalCartonCount} Units</p></div>
          <p className="text-5xl tracking-tighter">Rs. {grandTotal.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
};

export default SaleInvoice;
