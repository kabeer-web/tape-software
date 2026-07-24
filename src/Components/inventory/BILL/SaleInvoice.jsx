import { useState, useRef, useContext, useMemo, useEffect } from 'react';
import {
  FileText, Plus, Trash2, Printer,
  Upload, X, Save, AlertCircle, Box, Minus, Pencil, RotateCcw
} from 'lucide-react';

// ✅ Vercel Build Paths (Fixed)
import { useAccounts } from '../ACCOUNTS/AccountsContext';
import { StockContext, matchesCategory, sameBrand } from '../StockContext';
import AIBillAssistant from './AIBillAssistant';

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
// Carton sizes now come live from StockContext.cartonSizeOptions (managed in Sidebar).

const emptyItem   = { sizeUnit:'mm', sizeMm:'', sizeInch:'', yards:'', colour:'', brand:'', micron:'', totalCarton:'', perCtnQty:'', rate:'' };
const emptyCartonRow = { brand:'', type:'Small', size:'10', qty:'' };

// ── Draft auto-save ─────────────────────────────────────────
// Was: navigating to another page (Production, a Jambo file, etc.) mid-bill
// unmounts this component, and all its useState just resets — the half-typed
// bill vanished. Now every meaningful change is mirrored to localStorage, and
// it's read back in on mount, so leaving and coming back restores it exactly
// where it was left. It only gets cleared on a successful save or an explicit
// "Discard Draft".
const SALE_DRAFT_KEY = 'hs_sale_invoice_draft_v1';
const loadSaleDraft = () => {
  try {
    const raw = localStorage.getItem(SALE_DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};

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
  const logoHtml = logo ? `<img src="${logo}" style="height:56px;object-fit:contain;"/>` : `<div class="co-name">HS <span>Packages</span></div>`;

  const rowsHtml = (items || []).map((r, i) => {
    const size = r.sizeLabel || [r.sizeMm ? `${r.sizeMm}mm` : '', r.sizeInch ? `${r.sizeInch}` : '', r.yards ? `${r.yards}yds` : ''].filter(Boolean).join(' / ');
    return `
    <tr>
      <td style="text-align:center">${i + 1}</td>
      <td style="font-weight:600;text-align:left;padding-left:12px">${size}</td>
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
  body{font-family:'Segoe UI',Arial,sans-serif;font-size:11px;color:#1a1a1a;line-height:1.5;background:#fff}
  .accent-bar{height:6px;background:linear-gradient(90deg,#059669,#10b981)}
  .sheet{padding:32px 40px}
  .hdr{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #111;padding-bottom:18px;margin-bottom:24px}
  .co-name{font-size:22px;font-weight:900;letter-spacing:0.5px;color:#111}
  .co-name span{color:#059669}
  .co-info{font-size:9.5px;color:#555;font-weight:500;margin-top:8px;line-height:1.6}
  .inv-title{text-align:right}
  .inv-badge{display:inline-block;background:#111;color:#fff;font-size:20px;font-weight:900;letter-spacing:3px;padding:8px 20px;border-radius:6px;margin-bottom:6px}
  .copy-label{font-weight:700;font-size:9.5px;color:#666;text-transform:uppercase;letter-spacing:1px}
  .meta-grid{display:grid;grid-template-columns:repeat(3, 1fr);gap:14px;margin-bottom:26px}
  .meta-item{border:1px solid #e2e2e2;background:#fafafa;padding:11px 13px;border-radius:8px}
  .meta-label{font-size:8px;text-transform:uppercase;color:#059669;font-weight:800;letter-spacing:0.5px;margin-bottom:4px}
  .meta-value{font-size:13px;font-weight:800;color:#111}
  table{width:100%;border-collapse:collapse;margin-bottom:26px;border-radius:8px;overflow:hidden}
  thead th{background:#111;color:#fff;padding:11px 5px;font-size:9px;text-transform:uppercase;letter-spacing:0.5px;font-weight:700;text-align:center}
  tbody tr:nth-child(even){background:#fafafa}
  tbody td{padding:9px 5px;border-bottom:1px solid #eee;font-size:10.5px}
  tbody td:first-child{color:#888}
  tbody tr:last-child td{border-bottom:2px solid #111}
  .footer-area{display:flex;justify-content:space-between;gap:20px;align-items:stretch;margin-bottom:50px}
  .words-box{flex:1;border:1px solid #e2e2e2;background:#fafafa;padding:16px;border-radius:8px}
  .words-text{font-size:11.5px;font-weight:700;font-style:italic;color:#222;margin-top:4px}
  .cartons-line{margin-top:14px;font-size:12px;font-weight:800;color:#059669;border-top:1px dashed #ddd;padding-top:10px}
  .total-card{width:260px;background:#111;color:#fff;padding:20px;text-align:center;border-radius:10px}
  .total-label{font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;font-weight:700;margin-bottom:6px}
  .total-val{font-size:28px;font-weight:900;color:#fff}
  .sigs{display:grid;grid-template-columns:repeat(3,1fr);gap:50px;margin-top:60px}
  .sig-line{border-top:1.5px solid #111;text-align:center;padding-top:8px;font-weight:700;font-size:9.5px;text-transform:uppercase;color:#333;letter-spacing:0.5px}
  @media print{@page{margin:0;size:A4} .sheet{padding:14mm 16mm}}
</style></head><body>
<div class="accent-bar"></div>
<div class="sheet">
<div class="hdr">
  <div>${logoHtml}<div class="co-info">${ADDR}<br/>${PHONE}</div></div>
  <div class="inv-title"><div class="inv-badge">INVOICE</div><br/><div class="copy-label">Original Copy</div></div>
</div>
<div class="meta-grid">
  <div class="meta-item"><div class="meta-label">Customer / Buyer</div><div class="meta-value">${partyName || '—'}</div></div>
  <div class="meta-item"><div class="meta-label">Invoice Number</div><div class="meta-value">#${billNo || '—'}</div></div>
  <div class="meta-item"><div class="meta-label">Date of Issue</div><div class="meta-value">${date}</div></div>
</div>
<table>
  <thead><tr><th>#</th><th style="text-align:left;padding-left:12px">Product Description</th><th>Color</th><th>Brand</th><th>MIC</th><th>CTN</th><th>P.Qty</th><th>Total Qty</th><th>Rate</th><th>Amount</th></tr></thead>
  <tbody>${rowsHtml}</tbody>
</table>
<div class="footer-area">
  <div class="words-box">
    <div class="meta-label">Amount in Words</div>
    <div class="words-text">"${toWords(grandTotal)}"</div>
    <div class="cartons-line">Total Cartons: ${totalCartonCount} CTN</div>
  </div>
  <div class="total-card">
    <div class="total-label">Grand Total (PKR)</div>
    <div class="total-val">Rs. ${grandTotal.toLocaleString()}</div>
  </div>
</div>
<div class="sigs">
  <div class="sig-line">Prepared By</div>
  <div class="sig-line">Receiver's Signature</div>
  <div class="sig-line">Authorized Manager</div>
</div>
</div>
<script>window.onload=()=>{window.print();window.onafterprint=()=>window.close()}</script>
</body></html>`;
};

const SaleInvoice = () => {
  const { saveBill, postLedger, bills, ledger, parties }      = useAccounts();
  const { inventory, updateStock, cartonSizeOptions, brands }    = useContext(StockContext);

  const [savedDraft] = useState(loadSaleDraft); // read once, on mount only
  const [showDraftBanner, setShowDraftBanner] = useState(() =>
    !!(savedDraft && (savedDraft.rows?.length || savedDraft.cartonRows?.length || savedDraft.billNo || savedDraft.buyerName))
  );

  const [billNo,     setBillNo]     = useState(savedDraft?.billNo || '');
  const [buyerName,  setBuyerName]  = useState(savedDraft?.buyerName || '');

  // `parties` (from AccountsContext, a real Supabase table, live via
  // realtime) is now the primary source — a party added or renamed in
  // Ledger shows up here immediately and correctly, no separate sync logic
  // needed. Still UNIONed with the old hardcoded PARTIES list + bills for
  // safety/backward-compatibility, but those are now just a defensive
  // fallback, not the source of truth.
  const partySuggestions = useMemo(() => {
    const set = new Set(PARTIES);
    (parties || []).forEach(p => { if (p.type === 'Sale') set.add(p.name); });
    (bills || []).forEach(b => {
      if (b.billType === 'Sale' && b.partyName) set.add(String(b.partyName).toUpperCase());
    });
    (ledger || []).forEach(e => {
      if (e.party_type === 'Sale' && e.party_name) set.add(String(e.party_name).toUpperCase());
    });
    return Array.from(set);
  }, [bills, ledger, parties]);
  const [date,       setDate]       = useState(savedDraft?.date || new Date().toLocaleDateString('en-GB'));
  const [form,       setForm]       = useState(savedDraft?.form || emptyItem);
  const [formErrs,   setFormErrs]   = useState({});
  const [headerErrs, setHeaderErrs] = useState({});
  const [rows,       setRows]       = useState(savedDraft?.rows || []);
  const [editRowId,  setEditRowId]  = useState(null);
  const [cartonForm, setCartonForm] = useState(savedDraft?.cartonForm || emptyCartonRow);
  const [cartonRows, setCartonRows] = useState(savedDraft?.cartonRows || []);      // pending carton deductions for this bill
  const [removedCartons, setRemovedCartons] = useState(savedDraft?.removedCartons || []); // undo buffer for accidentally removed rows
  const [editCartonId, setEditCartonId] = useState(null);
  const [logo,       setLogo]       = useState(savedDraft?.logo || null);
  const [msg,        setMsg]        = useState('');
  const [cartonMsg,  setCartonMsg]  = useState(''); 
  const [saving,     setSaving]     = useState(false);
  const fileRef = useRef(null);

  // Mirror the in-progress bill to localStorage on every meaningful change.
  useEffect(() => {
    const draft = { billNo, buyerName, date, form, rows, cartonForm, cartonRows, removedCartons, logo };
    try { localStorage.setItem(SALE_DRAFT_KEY, JSON.stringify(draft)); } catch { /* storage full/unavailable — draft just won't persist */ }
  }, [billNo, buyerName, date, form, rows, cartonForm, cartonRows, removedCartons, logo]);

  const discardDraft = () => {
    try { localStorage.removeItem(SALE_DRAFT_KEY); } catch {}
    setBillNo(''); setBuyerName(''); setDate(new Date().toLocaleDateString('en-GB'));
    setForm(emptyItem); setRows([]); setEditRowId(null);
    setCartonForm(emptyCartonRow); setCartonRows([]); setRemovedCartons([]); setEditCartonId(null);
    setLogo(null); setShowDraftBanner(false);
  };

  const upd  = (k, v) => { setForm(p => ({...p, [k]: v})); setFormErrs(p => ({...p, [k]: ''})); };
  const updCartonForm = (k, v) => setCartonForm(p => ({...p, [k]: v}));

  // ── Carton deduction rows: add / edit / delete / undo ──────────────
  const addOrUpdateCartonRow = () => {
    const qty = parseInt(cartonForm.qty) || 0;
    if (!cartonForm.brand || qty <= 0) return;
    if (editCartonId) {
      setCartonRows(p => p.map(r => r.id === editCartonId ? { ...cartonForm, id: editCartonId, qty } : r));
      setEditCartonId(null);
    } else {
      setCartonRows(p => [...p, { id: Date.now(), ...cartonForm, qty }]);
    }
    setCartonForm(emptyCartonRow);
  };

  const startEditCartonRow = (row) => {
    setCartonForm({ brand: row.brand, type: row.type, size: row.size, qty: String(row.qty) });
    setEditCartonId(row.id);
  };

  const cancelEditCartonRow = () => {
    setCartonForm(emptyCartonRow);
    setEditCartonId(null);
  };

  const removeCartonRow = (id) => {
    const row = cartonRows.find(r => r.id === id);
    if (!row) return;
    setCartonRows(p => p.filter(r => r.id !== id));
    setRemovedCartons(p => [{ ...row, removedAt: Date.now() }, ...p].slice(0, 10)); // keep last 10 for undo
    if (editCartonId === id) cancelEditCartonRow();
  };

  const undoRemoveCartonRow = (id) => {
    const entry = removedCartons.find(r => r.id === id);
    if (!entry) return;
    const { removedAt, ...row } = entry;
    setCartonRows(p => [...p, row]);
    setRemovedCartons(p => p.filter(r => r.id !== id));
  };

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
    if (editRowId) {
      setRows(p => p.map(row => row.id === editRowId ? { ...form, id: editRowId, sizeLabel, totalCarton: tc, perCtnQty: pc, rate: r, totalQty, total } : row));
      setEditRowId(null);
    } else {
      setRows(p => [...p, { id: Date.now(), ...form, sizeLabel, totalCarton: tc, perCtnQty: pc, rate: r, totalQty, total }]);
    }
    setForm(emptyItem);
  };

  const startEditRow = (row) => {
    setForm({
      sizeUnit: row.sizeUnit || 'mm', sizeMm: row.sizeMm || '', sizeInch: row.sizeInch || '',
      yards: row.yards || '', colour: row.colour || '', brand: row.brand || '',
      micron: row.micron || '', totalCarton: String(row.totalCarton ?? ''),
      perCtnQty: String(row.perCtnQty ?? ''), rate: String(row.rate ?? ''),
    });
    setEditRowId(row.id);
  };

  const cancelEditRow = () => { setForm(emptyItem); setEditRowId(null); };

  const removeRow = (id) => {
    setRows(p => p.filter(r => r.id !== id));
    if (editRowId === id) cancelEditRow();
  };

  const handleSave = async () => {
    if (!validateHeader()) return;
    if (rows.length === 0) { setMsg('❌ Koi item add nahi hua!'); return; }

    // Validate every pending carton row BEFORE saving anything — a missing
    // or insufficient carton match fails the whole save with a clear error
    // instead of silently skipping that row's deduction.
    const resolvedCartons = [];
    for (const c of cartonRows) {
      const cQty = Number(c.qty) || 0;
      if (!c.brand || cQty <= 0) continue;
      const match = inventory.find(i => sameBrand(i.brand, c.brand) && matchesCategory(i, 'Carton') && (i.carton_type || i.cartonType) === c.type && String(i.size ?? i.carton_size ?? '') === String(c.size));
      if (!match) {
        setMsg(`❌ No matching carton stock found for ${c.brand} ${c.type} ${c.size}" — add it to inventory first.`);
        return;
      }
      if (Number(match.qty || 0) < cQty) {
        setMsg(`❌ Not enough carton stock: only ${match.qty} available for ${c.brand} ${c.type} ${c.size}", need ${cQty}.`);
        return;
      }
      resolvedCartons.push({ ...c, qty: cQty, inv: match });
    }

    setSaving(true);
    try {
      // Save the bill first. If a carton deduction fails after this, the
      // bill still exists as a record — safer than the reverse order,
      // where a stock deduction could succeed with no bill to explain it.
      const savedBill = await saveBill({ billType: 'Sale', billNo, partyName: buyerName, date, items: rows, grandTotal, totalCartonCount, cartonUsed: resolvedCartons.length ? resolvedCartons.map(({inv, ...c}) => c) : null, logo });

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

      for (const c of resolvedCartons) {
        await updateStock(c.inv._id || c.inv.id, -c.qty);
      }
      if (resolvedCartons.length) {
        setCartonMsg(`Inventory Updated: ${resolvedCartons.map(c => `${c.qty} ${c.brand} ${c.type}`).join(', ')} deducted successfully.`);
      }

      setMsg(`✅ Bill #${billNo} save ho gaya!`);
      try { localStorage.removeItem(SALE_DRAFT_KEY); } catch {}
      setRows([]); setEditRowId(null); setBillNo(''); setBuyerName(''); setCartonRows([]); setRemovedCartons([]); setCartonForm(emptyCartonRow); setHeaderErrs({});
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
          <AIBillAssistant
            billType="Sale"
            context={{ brands: (brands||[]).map(b=>b.name) }}
            onResult={(data) => {
              const newRows = (data.items || []).map((it, i) => {
                const tc = parseFloat(it.totalCarton) || 0;
                const pc = parseFloat(it.perCtnQty) || 0;
                const rate = parseFloat(it.rate) || 0;
                const totalQty = tc * pc;
                const total = totalQty * rate;
                const sizeLabel = [it.sizeMm ? `${it.sizeMm}mm` : '', it.sizeInch ? `${it.sizeInch}` : '', it.yards ? `${it.yards}yds` : ''].filter(Boolean).join(' / ');
                return {
                  id: Date.now() + i,
                  sizeUnit: 'mm', sizeMm: it.sizeMm||'', sizeInch: it.sizeInch||'', yards: it.yards||'',
                  colour: it.colour||'', brand: it.brand||'', micron: it.micron||'',
                  totalCarton: tc, perCtnQty: pc, rate, totalQty, total, sizeLabel,
                };
              });
              setRows(p => [...p, ...newRows]);
              if (data.partyName && !buyerName) setBuyerName(String(data.partyName).toUpperCase());
              if (data.billNo && !billNo) setBillNo(data.billNo);
            }}
          />
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

      {showDraftBanner && (
        <div className="mb-4 p-3 rounded-xl text-sm font-bold border bg-yellow-500/10 border-yellow-500/40 text-yellow-300 flex flex-wrap items-center justify-between gap-3">
          <span>📝 Aapka pichla adhura bill wapis load ho gaya hai.</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowDraftBanner(false)} className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs uppercase tracking-wide">Keep it</button>
            <button onClick={discardDraft} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs uppercase tracking-wide"><RotateCcw size={12}/> Discard Draft</button>
          </div>
        </div>
      )}

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
            <datalist id="parties-list">{partySuggestions.map((p,i) => <option key={i} value={p}/>)}</datalist>
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
        <button onClick={addItem} className="bg-[#22c55e] text-black font-black px-8 py-3 rounded-2xl flex items-center gap-2 hover:bg-emerald-400 transition text-xs uppercase tracking-widest"><Plus size={16}/> {editRowId ? 'Update Item' : 'Add to List'}</button>
        {editRowId && (
          <button onClick={cancelEditRow} className="px-4 py-3 rounded-2xl border border-white/10 text-gray-400 hover:text-red-400 transition text-xs font-bold uppercase">Cancel</button>
        )}
      </div>

      <div className="bg-yellow-500/5 p-5 rounded-[2rem] border border-yellow-500/20 mb-5">
        <p className="text-[10px] text-yellow-500 uppercase font-black tracking-widest mb-3 flex items-center gap-2"><Box size={14}/> Stock Sync (Internal Carton Use)</p>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <select value={cartonForm.brand} onChange={e => updCartonForm('brand', e.target.value)} className="bg-black/30 p-3 rounded-xl border border-yellow-500/10 text-sm outline-none"><option value="">Select Brand</option>{CARTON_BRANDS.map(b => <option key={b} value={b}>{b}</option>)}</select>
          <select value={cartonForm.type} onChange={e => updCartonForm('type', e.target.value)} className="bg-black/30 p-3 rounded-xl border border-yellow-500/10 text-sm outline-none"><option value="Small">Small</option><option value="Large">Large</option></select>
          <select value={cartonForm.size} onChange={e => updCartonForm('size', e.target.value)} className="bg-black/30 p-3 rounded-xl border border-yellow-500/10 text-sm outline-none">{cartonSizeOptions.map(s => <option key={s} value={s}>{s}"</option>)}</select>
          <input type="number" value={cartonForm.qty} onChange={e => updCartonForm('qty', e.target.value)} placeholder="Qty to minus" className="bg-black/30 p-3 rounded-xl border border-yellow-500/10 text-sm outline-none"/>
          <div className="flex gap-2">
            <button onClick={addOrUpdateCartonRow} className="flex-1 bg-yellow-500 text-black font-black text-xs uppercase rounded-xl px-3 py-3 hover:bg-yellow-400 transition flex items-center justify-center gap-1.5">
              <Minus size={13}/> {editCartonId ? 'Update' : 'Minus'}
            </button>
            {editCartonId && (
              <button onClick={cancelEditCartonRow} className="px-3 py-3 rounded-xl border border-white/10 text-gray-400 hover:text-red-400 transition text-xs font-bold">
                <X size={13}/>
              </button>
            )}
          </div>
        </div>

        {/* Pending carton deductions for this bill */}
        {cartonRows.length > 0 && (
          <div className="mt-4 space-y-1.5">
            <p className="text-[9px] text-gray-500 uppercase font-bold tracking-widest">Cartons Being Minused ({cartonRows.length})</p>
            {cartonRows.map(r => (
              <div key={r.id} className={`flex items-center justify-between gap-3 p-2.5 rounded-xl border text-sm ${editCartonId === r.id ? 'bg-yellow-500/10 border-yellow-500/40' : 'bg-black/20 border-white/5'}`}>
                <span className="font-bold text-white">{r.brand} — {r.type} — {r.size}"</span>
                <div className="flex items-center gap-3">
                  <span className="text-yellow-400 font-black">-{r.qty}</span>
                  <button onClick={() => startEditCartonRow(r)} className="p-1.5 text-gray-500 hover:text-yellow-400 hover:bg-yellow-500/10 rounded-lg transition"><Pencil size={13}/></button>
                  <button onClick={() => removeCartonRow(r.id)} className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition"><Trash2 size={13}/></button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Undo log — brings back an accidentally-removed row */}
        {removedCartons.length > 0 && (
          <div className="mt-4 pt-4 border-t border-white/5 space-y-1.5">
            <p className="text-[9px] text-gray-600 uppercase font-bold tracking-widest">Recently Removed — Undo Available</p>
            {removedCartons.map(r => (
              <div key={r.id} className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-black/10 border border-white/5 text-sm opacity-70">
                <span className="text-gray-400 line-through">{r.brand} — {r.type} — {r.size}" (-{r.qty})</span>
                <button onClick={() => undoRemoveCartonRow(r.id)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-white/10 text-gray-300 hover:text-yellow-400 hover:border-yellow-500/30 transition text-xs font-bold uppercase">
                  <RotateCcw size={12}/> Undo
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white/[0.02] rounded-[2rem] border border-white/5 overflow-hidden mb-8">
        <table className="w-full text-left">
          <thead className="bg-white/5 text-[10px] uppercase font-black text-slate-500"><tr><th className="p-5">#</th><th>Description</th><th className="text-center">CTN</th><th className="text-center">Total Qty</th><th className="text-right">Rate</th><th className="text-right p-5">Amount</th><th className="p-5"></th></tr></thead>
          <tbody className="divide-y divide-white/5">
            {rows.map((r, i) => (
              <tr key={r.id} className={`hover:bg-white/5 transition ${editRowId === r.id ? 'bg-yellow-500/10' : ''}`}><td className="p-5 text-gray-500">{i+1}</td><td><p className="font-bold">{r.brand} - {r.colour}</p><p className="text-[10px] text-gray-500 uppercase">{r.sizeLabel}</p></td><td className="text-center font-bold">{r.totalCarton}</td><td className="text-center text-emerald-500 font-bold">{r.totalQty}</td><td className="text-right font-mono text-xs">{(r.rate || 0).toLocaleString()}</td><td className="text-right font-black text-white p-5">{(r.total || 0).toLocaleString()}</td><td className="p-5"><div className="flex items-center justify-end gap-1"><button onClick={() => startEditRow(r)} className="p-1.5 text-gray-500 hover:text-yellow-400 hover:bg-yellow-500/10 rounded-lg transition"><Pencil size={14}/></button><button onClick={() => removeRow(r.id)} className="p-1.5 text-gray-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition"><Trash2 size={16}/></button></div></td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white/[0.03] p-6 rounded-[2rem] border border-white/5 flex flex-col justify-center"><p className="text-[10px] uppercase font-black text-gray-500 tracking-widest mb-2">In Words</p><p className="text-sm font-bold text-slate-300 italic">"{toWords(grandTotal)}"</p></div>
        <div className="bg-emerald-500 p-6 rounded-[2rem] flex items-center justify-between shadow-2xl"><div className="text-emerald-950">
          <p className="text-[10px] uppercase font-black tracking-widest opacity-60">Grand Total Payable</p>
          <p className="text-xs font-bold">{totalCartonCount} Cartons Total</p></div>
          <p className="text-4xl font-black text-emerald-950 tracking-tighter">Rs. {(grandTotal || 0).toLocaleString()}</p></div>
      </div>
    </div>
  );
};

export default SaleInvoice;