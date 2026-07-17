import { useState, useContext, useMemo, useEffect, useRef } from 'react';
import { StockContext } from '../StockContext';
import { useAccounts } from '../ACCOUNTS/AccountsContext';
import {
  Plus, Trash2, Archive, RotateCcw, Printer, Save, Upload, X,
  Package, Box, Layers, Truck
} from 'lucide-react';

const PURCHASE_PARTIES = ['UNIVERSAL COTTING','KOSHER','CHAWLA INDUSTRY','IBAD CORE','TAHSEEN CARTON','TALHA WASEEM','ASGHR CORE','DEER TAPE','SAMAD BHAI'];
const JAMBO_CATEGORIES = ['Clear','Tan','Cloth','Masking','Tissue','SuperYellow','SuperClear','Color','Foam','Lemon'];
const CARTON_SIZES = ['10', '10.5', '11', '12'];
const PLY_OPTIONS = ['5', '6', '8', '10'];
const BRANDS = ['Tesco','Bell','Race','Jhonson','Local','Imported'];
const ADDR = 'Karachi, Pakistan';

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

// Print template — same visual language as the Sale Invoice's letterhead
// (logo-or-"HS Packages" header, address strip, signature lines) so a
// Purchase bill doesn't look like a completely different, cheaper piece of
// paper next to a Sale bill.
const generatePurchasePrintHTML = (bill) => {
  const { billNo, partyName, date, items, grandTotal, chalanNo, logo } = bill;
  const logoHtml = logo ? `<img src="${logo}" style="height:56px;object-fit:contain;"/>` : `<div class="co-name">HS <span>Packages</span></div>`;
  const rowsHtml = items.map((r, i) => `
    <tr>
      <td style="text-align:center">${i + 1}</td>
      <td><b>${r.mainCategory}</b></td>
      <td>${r.specsLabel}</td>
      <td style="text-align:center">${r.qty}</td>
      <td style="text-align:right">${(r.rate || 0).toLocaleString()}</td>
      <td style="text-align:right;font-weight:bold">${(r.amount || 0).toLocaleString()}</td>
    </tr>`).join('');

  return `<html><head><title>Purchase #${billNo}</title><style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; }
    body{font-family:'Segoe UI',Arial,sans-serif;padding:36px;color:#1a1a1a;}
    .letterhead{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #10b981;padding-bottom:16px;margin-bottom:20px;}
    .co-name{font-size:26px;font-weight:900;font-style:italic;color:#111;}
    .co-name span{color:#10b981;}
    .co-info{font-size:11px;color:#666;margin-top:4px;text-align:right;}
    h1{font-size:15px;letter-spacing:3px;text-transform:uppercase;color:#10b981;margin:0 0 4px;}
    .meta{display:flex;justify-content:space-between;font-size:12px;color:#333;margin-bottom:18px;}
    .meta b{color:#000;}
    table{width:100%;border-collapse:collapse;margin-top:8px;font-size:12px;}
    th,td{border:1px solid #e0e0e0;padding:9px 10px;text-align:left;}
    th{background:#10b981;color:#fff;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;}
    tbody tr:nth-child(even){background:#f8fafc;}
    .total-row{display:flex;justify-content:flex-end;margin-top:18px;}
    .total-box{background:#f0fdf4;border:2px solid #10b981;border-radius:10px;padding:14px 22px;text-align:right;min-width:220px;}
    .total-box .label{font-size:10px;color:#666;text-transform:uppercase;letter-spacing:1px;}
    .total-box .value{font-size:22px;font-weight:900;color:#065f46;}
    .words{font-size:11px;font-style:italic;color:#555;margin-top:10px;}
    .sign{display:flex;justify-content:space-between;margin-top:70px;font-size:11px;}
    .sign div{border-top:1px solid #999;padding-top:6px;width:160px;text-align:center;color:#666;}
  </style></head><body>
    <div class="letterhead">
      <div>${logoHtml}<div class="co-info">${ADDR}</div></div>
      <div style="text-align:right"><h1>Purchase Invoice</h1><div class="co-info">Bill #${billNo || '—'}${chalanNo ? ` &nbsp;•&nbsp; Chalan #${chalanNo}` : ''}<br/>Date: ${date}</div></div>
    </div>
    <div class="meta"><span>Supplier: <b>${partyName}</b></span></div>
    <table><thead><tr><th>#</th><th>Category</th><th>Specs</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody>${rowsHtml}</tbody></table>
    <div class="total-row"><div class="total-box"><div class="label">Grand Total</div><div class="value">Rs. ${(grandTotal || 0).toLocaleString()}</div></div></div>
    <div class="words">"${toWords(grandTotal)}"</div>
    <div class="sign"><div>Received By</div><div>Authorized Signature</div></div>
    <script>window.onload=()=>{window.print();window.onafterprint=()=>window.close()}</script>
  </body></html>`;
};

const emptyForm = { mainCategory: 'Core', brand:'', side:'', ply:'', cartonType:'', size:'', jamboCategory:'', color:'', micron:'', width:'', weight:'', qty:'', rate:'' };

// Same fix as Sale Invoice — see the comment there for why this exists:
// leaving this page mid-bill used to lose everything typed so far.
const PURCHASE_DRAFT_KEY = 'hs_purchase_invoice_draft_v1';
const loadPurchaseDraft = () => {
  try {
    const raw = localStorage.getItem(PURCHASE_DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};

const CATEGORY_ICON = { Core: Package, Carton: Box, Jambo: Layers };

const PurchaseInvoice = () => {
  const { addRoll, upsertStock } = useContext(StockContext);
  const { saveBill, postLedger, bills, ledger, parties } = useAccounts();

  const [savedDraft] = useState(loadPurchaseDraft); // read once, on mount only
  const [showDraftBanner, setShowDraftBanner] = useState(() =>
    !!(savedDraft && (savedDraft.rows?.length || savedDraft.billNo || savedDraft.supplierName))
  );

  const [billNo, setBillNo] = useState(savedDraft?.billNo || '');
  const [supplierName, setSupplierName] = useState(savedDraft?.supplierName || '');
  const [chalanNo, setChalanNo] = useState(savedDraft?.chalanNo || '');
  const [date, setDate] = useState(savedDraft?.date || new Date().toLocaleDateString('en-GB'));
  const [logo, setLogo] = useState(savedDraft?.logo || null);
  // When OFF, saving the bill records the bill + ledger entry ONLY — it does
  // NOT touch Jambo/Core/Carton stock. For when the goods were already added
  // manually (e.g. someone added the roll from their phone the moment the
  // truck arrived) and billing it too would double-add the stock. ON by
  // default so nothing changes unless you deliberately switch it off.
  const [updateStock, setUpdateStock] = useState(savedDraft?.updateStock ?? true);
  const fileRef = useRef(null);

  // `parties` (from AccountsContext, a real Supabase table, live via
  // realtime) is now the primary source — a supplier added or renamed in
  // Ledger shows up here immediately and correctly. Still UNIONed with the
  // old hardcoded PURCHASE_PARTIES list + bills for safety, but those are
  // now just a defensive fallback, not the source of truth.
  const supplierSuggestions = useMemo(() => {
    const set = new Set(PURCHASE_PARTIES);
    (parties || []).forEach(p => { if (p.type === 'Purchase') set.add(p.name); });
    (bills || []).forEach(b => {
      if (b.billType === 'Purchase' && b.partyName) set.add(String(b.partyName).toUpperCase());
    });
    (ledger || []).forEach(e => {
      if (e.party_type === 'Purchase' && e.party_name) set.add(String(e.party_name).toUpperCase());
    });
    return Array.from(set);
  }, [bills, ledger, parties]);
  const [form, setForm] = useState(savedDraft?.form || emptyForm);
  const [rows, setRows] = useState(savedDraft?.rows || []);
  const [msg, setMsg] = useState({ text: '', ok: true });
  const [saving, setSaving] = useState(false);

  // Mirror the in-progress bill to localStorage on every meaningful change,
  // so navigating to Production/Jambo/etc. and coming back restores it.
  useEffect(() => {
    const draft = { billNo, supplierName, chalanNo, date, form, rows, logo, updateStock };
    try { localStorage.setItem(PURCHASE_DRAFT_KEY, JSON.stringify(draft)); } catch { /* storage full/unavailable — draft just won't persist */ }
  }, [billNo, supplierName, chalanNo, date, form, rows, logo, updateStock]);

  const discardDraft = () => {
    try { localStorage.removeItem(PURCHASE_DRAFT_KEY); } catch {}
    setBillNo(''); setSupplierName(''); setChalanNo(''); setDate(new Date().toLocaleDateString('en-GB'));
    setForm(emptyForm); setRows([]); setLogo(null); setUpdateStock(true); setShowDraftBanner(false);
  };

  const addItem = () => {
    const qty = parseFloat(form.qty);
    const rate = parseFloat(form.rate);
    if (!qty || !rate) return;
    // Weight-based pricing is optional and Jambo-only — if left blank,
    // behaves exactly as before (Rate × Qty/Yards). If a weight is given,
    // Rate × Weight(KG) becomes the amount instead, since Jambo rolls are
    // often actually priced by weight, not yardage.
    const weight = parseFloat(form.weight) || 0;
    const isJamboWeighted = form.mainCategory === 'Jambo' && weight > 0;
    const amount = isJamboWeighted ? rate * weight : qty * rate;
    let specsLabel = '';
    if (form.mainCategory === 'Core') specsLabel = `${form.brand} • ${form.side} • ${form.ply} Ply`;
    else if (form.mainCategory === 'Carton') specsLabel = `${form.brand} • ${form.cartonType} • ${form.size}"`;
    else specsLabel = `${form.jamboCategory} • ${form.micron}mic • ${form.width}mm${form.color ? ` • ${form.color}` : ''}${weight ? ` • ${weight}kg` : ''}`;

    setRows(p => [...p, { id: Date.now(), ...form, qty, rate, weight, amount, specsLabel }]);
    setForm({ ...emptyForm, mainCategory: form.mainCategory });
  };

  const handleSaveBill = async () => {
    if (rows.length === 0) return;
    setSaving(true);
    try {
      // Build enriched items (with a link to the exact inventory row each
      // line affected) instead of saving `rows` as-is — Saved Bills needs
      // this to reverse a specific Jambo roll precisely on edit/delete,
      // rather than guessing by spec match (which breaks if two rolls
      // share the same brand/micron/width).
      //
      // If updateStock is OFF, this whole block is skipped — the bill still
      // saves and still posts to the ledger, it just doesn't touch
      // Jambo/Core/Carton stock (for when it was already added manually).
      const enrichedItems = [];
      for (const r of rows) {
        if (!updateStock) { enrichedItems.push({ ...r, inventoryId: null, rollNo: null }); continue; }
        let saved;
        if (r.mainCategory === 'Core') {
          // upsertStock (not addRoll) — merges into an existing matching
          // row instead of creating a duplicate. Same fix as the Core/Carton
          // brand pages.
          saved = await upsertStock({ brand: r.brand, category: 'Core', side: r.side, ply: r.ply }, r.qty);
        } else if (r.mainCategory === 'Carton') {
          saved = await upsertStock({ brand: r.brand, category: 'Carton', carton_type: r.cartonType, size: r.size }, r.qty);
        } else {
          // Jambo: always a new roll with its own auto-generated roll number.
          saved = await addRoll({ category: r.jamboCategory, micron: r.micron, width: r.width, yards: r.qty, color: r.color, weight: r.weight || 0 });
        }
        enrichedItems.push({ ...r, inventoryId: saved?._id || saved?.id || null, rollNo: saved?.roll_no || saved?.rollNo || null });
      }
      const grandTotal = rows.reduce((s, r) => s + r.amount, 0);
      const savedBill = await saveBill({ billType: 'Purchase', billNo, partyName: supplierName.toUpperCase(), date, items: enrichedItems, grandTotal, chalanNo, logo });

      // Post the payable to the ledger so Accounts balances actually reflect
      // this purchase (see debit/credit convention documented in
      // AccountsContext.jsx — Purchase = 'credit', we owe the supplier).
      await postLedger({
        party_name: supplierName.toUpperCase(),
        party_type: 'Purchase',
        entry_type: 'credit',
        description: `Purchase Bill #${billNo || savedBill.id}`,
        amount: grandTotal,
        date,
        ref_bill_no: billNo,
        bill_id: savedBill.id,
      });

      try { localStorage.removeItem(PURCHASE_DRAFT_KEY); } catch {}
      setRows([]); setBillNo(''); setSupplierName('');
      setMsg({ text: updateStock ? '✅ Purchase Saved! Stock updated.' : '✅ Purchase Saved! Stock NOT touched (manual add already done).', ok: true });
    } catch (err) { setMsg({ text: '❌ Error: ' + err.message, ok: false }); }
    finally { setSaving(false); setTimeout(() => setMsg({ text: '', ok: true }), 5000); }
  };

  const handlePrint = () => {
    const html = generatePurchasePrintHTML({ billNo, partyName: supplierName, date, items: rows, grandTotal: rows.reduce((s, r) => s + r.amount, 0), chalanNo, logo });
    const w = window.open('', '_blank'); w.document.write(html); w.document.close();
  };

  const grandTotal = rows.reduce((s, r) => s + r.amount, 0);

  return (
    <div className="max-w-6xl mx-auto text-white">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <h1 className="text-3xl md:text-4xl font-black italic tracking-tighter"><Archive className="inline text-[#22c55e] mr-2 -mt-2" size={30}/> PURCHASE <span className="text-[#22c55e]">INVOICE</span></h1>
        <div className="flex gap-3">
          <button onClick={handlePrint} disabled={rows.length===0} className="flex items-center gap-2 bg-white/5 hover:bg-white/10 px-5 py-2.5 rounded-xl font-bold uppercase text-xs tracking-wide transition disabled:opacity-30"><Printer size={14}/> Print</button>
          <button onClick={handleSaveBill} disabled={rows.length === 0 || saving} className="flex items-center gap-2 bg-[#22c55e] text-black hover:bg-[#1db954] px-6 py-2.5 rounded-xl font-black uppercase text-xs tracking-wide transition disabled:opacity-30"><Save size={14}/> {saving ? 'Saving...' : 'Save Bill'}</button>
        </div>
      </div>

      {msg.text && <div className={`p-4 rounded-2xl mb-5 font-bold text-sm border ${msg.ok ? 'bg-[#22c55e]/10 border-[#22c55e]/40 text-[#22c55e]' : 'bg-red-500/10 border-red-500/40 text-red-400'}`}>{msg.text}</div>}

      {showDraftBanner && (
        <div className="p-4 rounded-2xl mb-5 font-bold border bg-yellow-500/10 border-yellow-500/40 text-yellow-300 flex flex-wrap items-center justify-between gap-3">
          <span>📝 Aapka pichla adhura bill wapis load ho gaya hai.</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowDraftBanner(false)} className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs uppercase tracking-wide">Keep it</button>
            <button onClick={discardDraft} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs uppercase tracking-wide"><RotateCcw size={12}/> Discard Draft</button>
          </div>
        </div>
      )}

      {/* Header / party card */}
      <div className="bg-white/[0.03] p-6 rounded-[2rem] border border-[#22c55e]/20 mb-5">
        <div className="flex items-center gap-4 mb-5 pb-5 border-b border-white/5">
          {logo ? (
            <div className="relative group shrink-0">
              <img src={logo} className="h-14 w-auto object-contain rounded-xl border border-white/10 p-1 bg-white/5"/>
              <button onClick={() => setLogo(null)} className="absolute -top-1.5 -right-1.5 bg-red-600 text-white rounded-full p-0.5"><X size={10}/></button>
            </div>
          ) : (
            <button onClick={() => fileRef.current?.click()} className="flex flex-col items-center justify-center gap-1 w-16 h-14 border-2 border-dashed border-[#22c55e]/30 rounded-xl text-[#22c55e]/50 hover:border-[#22c55e] hover:text-[#22c55e] transition text-[8px] font-bold shrink-0"><Upload size={14}/>LOGO</button>
          )}
          <input ref={fileRef} type="file" accept="image/*" onChange={(e)=>{const f=e.target.files[0]; if(f){const rd=new FileReader(); rd.onload=()=>setLogo(rd.result); rd.readAsDataURL(f);}}} className="hidden"/>
          <div className="flex-1">
            <p className="text-sm font-black text-white flex items-center gap-1.5"><Truck size={14} className="text-[#22c55e]"/> Supplier Details</p>
            <p className="text-[10px] text-gray-500">Bill jitna behtar bharoge, print utna hi saaf niklega.</p>
          </div>

          {/* Stock-update toggle — OFF when the goods were already added
              manually (e.g. from the phone the moment the truck arrived), so
              saving this bill doesn't double-add the stock. */}
          <button
            onClick={() => setUpdateStock(v => !v)}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border transition shrink-0 ${updateStock ? 'bg-[#22c55e]/10 border-[#22c55e]/40 text-[#22c55e]' : 'bg-yellow-500/10 border-yellow-500/40 text-yellow-300'}`}
            title={updateStock ? 'Save karne par stock add hogi' : 'Save karne par stock NAHI badlegi (already manual add ho chuka hai)'}
          >
            <span className={`relative w-9 h-5 rounded-full transition ${updateStock ? 'bg-[#22c55e]' : 'bg-white/20'}`}>
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-black transition-transform ${updateStock ? 'translate-x-4' : 'translate-x-0'}`}></span>
            </span>
            <span className="text-xs font-bold text-left leading-tight">
              {updateStock ? <>Stock Update<br/><span className="opacity-70 font-normal">ON — add hogi</span></> : <>Stock Update<br/><span className="opacity-70 font-normal">OFF — sirf bill</span></>}
            </span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5">Supplier Name</label>
            <input list="s-list" value={supplierName} onChange={e=>setSupplierName(e.target.value)} placeholder="e.g. UNIVERSAL COTTING" className="w-full bg-black/30 p-3 rounded-xl border border-white/10 outline-none focus:border-[#22c55e]/60 text-sm transition"/>
            <datalist id="s-list">{supplierSuggestions.map(p=><option key={p} value={p}/>)}</datalist>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5">Bill #</label>
            <input value={billNo} onChange={e=>setBillNo(e.target.value)} placeholder="Optional" className="w-full bg-black/30 p-3 rounded-xl border border-white/10 outline-none focus:border-[#22c55e]/60 text-sm transition"/>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5">Chalan #</label>
            <input value={chalanNo} onChange={e=>setChalanNo(e.target.value)} placeholder="Optional" className="w-full bg-black/30 p-3 rounded-xl border border-white/10 outline-none focus:border-[#22c55e]/60 text-sm transition"/>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5">Date</label>
            <input value={date} onChange={e=>setDate(e.target.value)} className="w-full bg-black/30 p-3 rounded-xl border border-white/10 outline-none focus:border-[#22c55e]/60 text-sm transition"/>
          </div>
        </div>
      </div>

      {/* Item entry card */}
      <div className="bg-white/[0.03] p-6 rounded-[2rem] border border-[#22c55e]/20 mb-5">
        <div className="flex gap-2 mb-5">
          {['Core','Carton','Jambo'].map(cat => {
            const Icon = CATEGORY_ICON[cat];
            return (
              <button key={cat} onClick={()=>setForm({...emptyForm, mainCategory: cat})}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition ${form.mainCategory===cat ? 'bg-[#22c55e] text-black' : 'bg-black/30 text-gray-400 hover:bg-black/40'}`}>
                <Icon size={15}/> {cat}
              </button>
            );
          })}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 items-end">
          {form.mainCategory === 'Core' && (
            <>
              <select value={form.brand} onChange={e=>setForm({...form, brand:e.target.value})} className="bg-black/30 p-3 rounded-xl border border-white/10 outline-none text-sm"><option value="">Brand</option>{BRANDS.map(b=><option key={b} value={b}>{b}</option>)}</select>
              <select value={form.side} onChange={e=>setForm({...form, side:e.target.value})} className="bg-black/30 p-3 rounded-xl border border-white/10 outline-none text-sm"><option value="">Side</option><option value="Single">Single</option><option value="Double">Double</option></select>
              <select value={form.ply} onChange={e=>setForm({...form, ply:e.target.value})} className="bg-black/30 p-3 rounded-xl border border-white/10 outline-none text-sm"><option value="">Ply</option>{PLY_OPTIONS.map(p=><option key={p} value={p}>{p} Ply</option>)}</select>
            </>
          )}
          {form.mainCategory === 'Carton' && (
            <>
              <select value={form.brand} onChange={e=>setForm({...form, brand:e.target.value})} className="bg-black/30 p-3 rounded-xl border border-white/10 outline-none text-sm"><option value="">Brand</option>{BRANDS.map(b=><option key={b} value={b}>{b}</option>)}</select>
              <select value={form.cartonType} onChange={e=>setForm({...form, cartonType:e.target.value})} className="bg-black/30 p-3 rounded-xl border border-white/10 outline-none text-sm"><option value="">Type</option><option value="Small">Small</option><option value="Large">Large</option></select>
              <select value={form.size} onChange={e=>setForm({...form, size:e.target.value})} className="bg-black/30 p-3 rounded-xl border border-white/10 outline-none text-sm"><option value="">Size</option>{CARTON_SIZES.map(s=><option key={s} value={s}>{s}"</option>)}</select>
            </>
          )}
          {form.mainCategory === 'Jambo' && (
            <>
              <select value={form.jamboCategory} onChange={e=>setForm({...form, jamboCategory:e.target.value})} className="bg-black/30 p-3 rounded-xl border border-white/10 outline-none text-sm"><option value="">Jambo Type</option>{JAMBO_CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}</select>
              <input value={form.micron} onChange={e=>setForm({...form, micron:e.target.value})} placeholder="Micron" className="bg-black/30 p-3 rounded-xl border border-white/10 outline-none text-sm" />
              <input value={form.width} onChange={e=>setForm({...form, width:e.target.value})} placeholder="Width (mm)" className="bg-black/30 p-3 rounded-xl border border-white/10 outline-none text-sm" />
              <input type="number" value={form.weight} onChange={e=>setForm({...form, weight:e.target.value})} placeholder="Weight (KG) — optional" className="bg-black/30 p-3 rounded-xl border border-white/10 outline-none text-sm" />
            </>
          )}
          <input type="number" value={form.qty} onChange={e=>setForm({...form, qty:e.target.value})} placeholder="Qty / Yards" className="bg-black/30 p-3 rounded-xl border border-white/10 outline-none text-sm" />
          <input type="number" value={form.rate} onChange={e=>setForm({...form, rate:e.target.value})} placeholder="Rate" className="bg-black/30 p-3 rounded-xl border border-white/10 outline-none text-sm" />
          <button onClick={addItem} className="bg-[#22c55e] text-black font-black p-3 rounded-xl flex items-center justify-center gap-2 hover:bg-[#1db954] transition text-xs uppercase tracking-wide"><Plus size={16}/> Add</button>
        </div>
      </div>

      {/* Items table */}
      <div className="bg-white/[0.03] rounded-[2rem] border border-[#22c55e]/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[640px]">
            <thead className="bg-black/30 text-gray-500 uppercase text-[10px] tracking-widest">
              <tr><th className="p-4">Category</th><th className="p-4">Specs</th><th className="p-4 text-center">Qty</th><th className="p-4 text-right">Rate</th><th className="p-4 text-right">Total</th><th className="p-4 w-12"></th></tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.length === 0 ? (
                <tr><td colSpan={6} className="p-16 text-center text-gray-600 font-bold uppercase tracking-widest italic">Koi item add nahi hua.</td></tr>
              ) : rows.map(r=>(
                <tr key={r.id} className="hover:bg-white/[0.02] transition">
                  <td className="p-4 font-bold text-[#22c55e] text-sm">{r.mainCategory}</td>
                  <td className="p-4 text-xs text-gray-400">{r.specsLabel}</td>
                  <td className="p-4 text-center font-bold text-sm">{r.qty}</td>
                  <td className="p-4 text-right font-mono text-xs text-gray-400">{(r.rate || 0).toLocaleString()}</td>
                  <td className="p-4 text-right font-black text-white">Rs. {(r.amount || 0).toLocaleString()}</td>
                  <td className="p-4 text-right"><button onClick={()=>setRows(p=>p.filter(x=>x.id!==r.id))} className="text-gray-600 hover:text-red-500 transition"><Trash2 size={16}/></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length > 0 && (
          <div className="flex justify-end p-6 border-t border-white/5">
            <div className="bg-[#22c55e]/10 border border-[#22c55e]/30 rounded-2xl px-6 py-4 text-right">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Grand Total</p>
              <p className="text-2xl font-black text-[#22c55e]">Rs. {grandTotal.toLocaleString()}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PurchaseInvoice;
