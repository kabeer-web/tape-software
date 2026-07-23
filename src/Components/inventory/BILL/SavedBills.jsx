import { useState, useContext } from 'react';
import { useAccounts } from '../ACCOUNTS/AccountsContext';
import { StockContext } from '../StockContext';
import {
  FileText, Pencil, Trash2, Check, X,
  Plus, Search, Printer, Users, ChevronDown
} from 'lucide-react';

// Options for editing a Purchase Jambo item's spec fields — same list
// PurchaseInvoice.jsx uses when the item was first entered.
const JAMBO_CATEGORIES = ['Clear','Tan','Cloth','Masking','Tissue','SuperYellow','SuperClear','Color','Foam','Lemon'];

// ── Number to words ───────────────────────────────────────
const ones = ['','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
const tens = ['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
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

// ── Print function (same format as SaleInvoice) ──────────
const printBill = (bill) => {
  if (bill.billType !== 'Sale') {
    alert('Abhi sirf Sale bills print ho sakti hain.');
    return;
  }

  const rowsHtml = (bill.items || []).map((r, i) => {
    const size = r.sizeLabel || [
      r.sizeMm    ? `${r.sizeMm}mm`  : '',
      r.sizeInch  ? `${r.sizeInch}`  : '',
      r.yards     ? `${r.yards}yds`  : '',
    ].filter(Boolean).join(' / ') || r.size || '—';

    return `
    <tr>
      <td style="text-align:center">${i + 1}</td>
      <td>${size}</td>
      <td>${r.colour || ''}</td>
      <td>${r.brand  || ''}</td>
      <td>${r.micron || ''}</td>
      <td style="text-align:center">${r.totalCarton || ''}</td>
      <td style="text-align:center">${r.perCtnQty  || ''}</td>
      <td style="text-align:center;font-weight:700">${r.totalQty || ''}</td>
      <td style="text-align:right">${(r.rate  || 0).toLocaleString()}</td>
      <td style="text-align:right;font-weight:700">${(r.total || 0).toLocaleString()}</td>
    </tr>`;
  }).join('');

  const total    = bill.grandTotal || 0;
  const ctnCount = bill.totalCartonCount || 0;

  const html = `<!DOCTYPE html><html><head>
<meta charset="utf-8"/>
<title>Invoice #${bill.billNo || ''}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:Arial,sans-serif;font-size:11px;color:#000;padding:20px 24px;background:#fff}
  .hdr{display:flex;justify-content:space-between;align-items:flex-start;
    padding-bottom:10px;border-bottom:2.5px solid #111;margin-bottom:12px}
  .co-row{display:flex;align-items:center;gap:10px;margin-bottom:4px}
  .co-name{font-size:17px;font-weight:900}
  .co-sub{font-size:9.5px;color:#555;line-height:1.7}
  .inv-lbl{font-size:21px;font-weight:900;letter-spacing:2px}
  .meta{display:flex;margin-bottom:12px;border:1px solid #ccc;border-radius:4px;overflow:hidden}
  .mc{flex:1;padding:7px 11px;border-right:1px solid #ddd}
  .mc:last-child{border-right:none}
  .ml{font-size:7.5px;text-transform:uppercase;color:#aaa;letter-spacing:.5px;margin-bottom:2px}
  .mv{font-size:12px;font-weight:700}
  table{width:100%;border-collapse:collapse;margin-bottom:12px}
  thead tr{background:#111;color:#fff}
  th{padding:7px 6px;font-size:8px;text-transform:uppercase;letter-spacing:.4px;font-weight:700}
  td{padding:6px 6px;border-bottom:1px solid #ebebeb;font-size:10.5px;vertical-align:middle}
  tbody tr:nth-child(even) td{background:#f8f8f8}
  tbody tr:last-child td{border-bottom:1.5px solid #bbb}
  .foot{display:grid;grid-template-columns:1fr 0.65fr 0.85fr;gap:10px;margin-bottom:0}
  .fbox{border:1px solid #ccc;border-radius:4px;padding:9px 11px}
  .flbl{font-size:7.5px;text-transform:uppercase;color:#aaa;letter-spacing:.5px;margin-bottom:4px}
  .fval{font-size:10.5px;font-weight:600;line-height:1.5}
  .fval-big{font-size:18px;font-weight:900}
  .ftotal{border:2px solid #111;border-radius:4px;padding:9px 14px;
    display:flex;justify-content:space-between;align-items:center}
  .ftlbl{font-size:9px;font-weight:600;text-transform:uppercase;color:#555}
  .ftval{font-size:22px;font-weight:900}
  .sigs{display:grid;grid-template-columns:1fr 1fr 1fr;gap:30px;margin-top:60px}
  .sig{border-top:1px solid #111;padding-top:8px;font-size:10px;font-weight:600;color:#444}
  @media print{body{padding:14px 18px}@page{margin:8mm;size:A4}}
</style>
</head><body>

<div class="hdr">
  <div>
    <div class="co-row"><span class="co-name">HS Packages</span></div>
    <div class="co-sub">${ADDR}<br/>${PHONE}</div>
  </div>
  <div class="inv-lbl">INVOICE</div>
</div>

<div class="meta">
  <div class="mc"><div class="ml">Bill No</div><div class="mv">${bill.billNo || '—'}</div></div>
  <div class="mc"><div class="ml">Buyer Name</div><div class="mv">${bill.partyName || '—'}</div></div>
  <div class="mc"><div class="ml">Date</div><div class="mv">${bill.date || '—'}</div></div>
</div>

<table>
  <thead><tr>
    <th style="width:22px;text-align:center">#</th>
    <th>Size</th><th>Colour</th><th>Brand</th><th>MIC</th>
    <th style="text-align:center">Total CTN</th>
    <th style="text-align:center">Per CTN</th>
    <th style="text-align:center">Total Qty</th>
    <th style="text-align:right">Rate</th>
    <th style="text-align:right">Total</th>
  </tr></thead>
  <tbody>${rowsHtml}</tbody>
</table>

<div class="foot">
  <div class="fbox">
    <div class="flbl">Amount in Words</div>
    <div class="fval">${toWords(total)}</div>
  </div>
  <div class="fbox">
    <div class="flbl">Total Cartons</div>
    <div class="fval fval-big">${ctnCount} <span style="font-size:11px;font-weight:600;color:#666">CTN</span></div>
  </div>
  <div class="ftotal">
    <div class="ftlbl">Grand Total</div>
    <div class="ftval">${total.toLocaleString()}</div>
  </div>
</div>

<div class="sigs">
  <div class="sig">Authorised</div>
  <div class="sig">Receiver Name</div>
  <div class="sig">Vehical No</div>
</div>

<script>window.onload=()=>{window.print();window.onafterprint=()=>window.close()}</script>
</body></html>`;

  const w = window.open('', '_blank', 'width=1000,height=750');
  w.document.write(html);
  w.document.close();
};

// ── Component ─────────────────────────────────────────────
const emptyItem = {
  sizeMm:'', sizeInch:'', yards:'',
  colour:'', brand:'', micron:'',
  totalCarton:'', perCtnQty:'', rate:''
};

const SavedBills = () => {
  const { bills, updateBill, deleteBill, updateEntry, deleteEntry, getLedgerEntryForBill } = useAccounts();
  const { inventory, upsertStock, adjustStock, brands, plyOptions, cartonSizeOptions } = useContext(StockContext);

  const [editId,      setEditId]      = useState(null);
  const [editData,    setEditData]    = useState(null);
  const [filterType,  setFilterType]  = useState('All');
  const [search,      setSearch]      = useState('');
  const [addingItem,  setAddingItem]  = useState(false);
  const [newItemForm, setNewItemForm] = useState(emptyItem);
  const [busyId,       setBusyId]     = useState(null); // bill currently being saved/deleted (disables its buttons)
  const [actionErr,    setActionErr]  = useState('');

  // ── Filter ────────────────────────────────────────────
  const filtered = bills.filter(b =>
    (filterType === 'All' || b.billType === filterType) &&
    (search === '' ||
      b.partyName?.toLowerCase().includes(search.toLowerCase()) ||
      String(b.billNo || '').includes(search))
  );

  // ── Group by party ─────────────────────────────────────
  // So Sale and Purchase bills for the same party sit together, clearly
  // labeled, instead of one long chronological list mixing every party and
  // bill type together.
  const [collapsedParties, setCollapsedParties] = useState(new Set());
  const toggleParty = (party) => setCollapsedParties(prev => {
    const next = new Set(prev);
    if (next.has(party)) next.delete(party); else next.add(party);
    return next;
  });

  const groupedByParty = (() => {
    const map = new Map();
    filtered.forEach(b => {
      const party = b.partyName || 'Unknown';
      if (!map.has(party)) map.set(party, []);
      map.get(party).push(b);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  })();

  // ── Edit helpers ──────────────────────────────────────
  const startEdit = (bill) => {
    setEditId(bill._id || bill.id);
    setEditData({ ...bill, items: (bill.items || []).map(i => ({ ...i })) });
    setAddingItem(false);
  };
  const cancelEdit = () => { setEditId(null); setEditData(null); setAddingItem(false); setActionErr(''); };

  // Applies a qty delta (+ or -) for one Purchase line item against real
  // inventory. Core/Carton are qty-pools matched by spec (brand/side/ply or
  // brand/type/size) — always safe to net-delta since those fields aren't
  // editable here. Jambo lines are matched by the specific inventoryId
  // recorded when the bill was saved (see PurchaseInvoice.jsx) — bills saved
  // before that linkage existed can't be precisely reversed, so we warn
  // instead of guessing at the wrong roll.
  const applyPurchaseItemDelta = async (item, qtyDelta) => {
    if (!qtyDelta) return;
    if (item.mainCategory === 'Core') {
      await upsertStock({ brand: item.brand, category: 'Core', side: item.side, ply: item.ply }, qtyDelta);
    } else if (item.mainCategory === 'Carton') {
      await upsertStock({ brand: item.brand, category: 'Carton', carton_type: item.cartonType, size: item.size }, qtyDelta);
    } else if (item.inventoryId) {
      const invItem = inventory.find(i => (i._id || i.id) === item.inventoryId);
      if (invItem) await adjustStock(invItem, 'yards', qtyDelta);
      else console.warn('SavedBills: linked Jambo roll no longer exists, skipping reversal', item);
    } else {
      console.warn('SavedBills: Jambo item has no inventoryId (bill saved before this fix) — cannot reverse precisely', item);
    }
  };

  // Keeps the ledger entry's amount in sync with an edited bill total so
  // Accounts balances don't drift from the actual invoice.
  const syncLedgerAmount = async (bill, newTotal) => {
    const entry = getLedgerEntryForBill(bill._id || bill.id);
    if (entry && Number(entry.amount) !== Number(newTotal)) {
      await updateEntry(entry._id || entry.id, { amount: newTotal });
    }
  };

  const saveEdit = async () => {
    const bill = bills.find(b => (b._id || b.id) === editId);
    if (!bill) { cancelEdit(); return; }

    // updateEditItem only patches the one field you typed into (rate, qty,
    // totalCarton, perCtnQty) — it never touches that row's own derived
    // total. Without this recompute, saving an edit updated the bill's
    // Grand Total correctly but left every individual row's displayed
    // total/amount frozen at whatever it was when the item was first
    // added, making the edit look like it didn't take effect.
    const recomputedItems = (editData.items || []).map(i => {
      if (editData.billType === 'Sale') {
        const totalQty = (parseFloat(i.totalCarton) || 0) * (parseFloat(i.perCtnQty) || 0);
        return { ...i, totalQty, total: totalQty * (parseFloat(i.rate) || 0) };
      }
      // Purchase — also recompute specsLabel, since brand/side/ply/
      // cartonType/size/jambo fields are now editable here too.
      let specsLabel = i.specsLabel;
      if (i.mainCategory === 'Core') specsLabel = `${i.brand} • ${i.side} • ${i.ply} Ply`;
      else if (i.mainCategory === 'Carton') specsLabel = `${i.brand} • ${i.cartonType} • ${i.size}"`;
      else if (i.mainCategory === 'Jambo') specsLabel = `${i.jamboCategory} • ${i.micron}mic • ${i.width}mm${i.color ? ` • ${i.color}` : ''}${i.weight ? ` • ${i.weight}kg` : ''}`;
      return { ...i, specsLabel, amount: (parseFloat(i.qty) || 0) * (parseFloat(i.rate) || 0) };
    });

    const grandTotal = recomputedItems.reduce((s, i) =>
      s + (editData.billType === 'Sale' ? (i.total || 0) : (i.amount || 0)), 0);
    const totalCartonCount = recomputedItems.reduce((s, i) => s + (parseFloat(i.totalCarton)||0), 0);

    setBusyId(editId); setActionErr('');
    try {
      if (editData.billType === 'Purchase') {
        // Purchase line items ARE what drove inventory, so a qty change or
        // removal here must move real stock by the same delta — "Reverse
        // old values, apply new values" implemented as a net delta rather
        // than reverse-everything-then-reapply-everything, which would be
        // wasteful and would break Jambo roll continuity (a full
        // reverse+recreate would spawn a brand new roll number for an item
        // whose quantity just changed).
        const oldById = new Map((bill.items || []).map(i => [i.id, i]));
        const newById = new Map((editData.items || []).map(i => [i.id, i]));

        // What defines "the same stock row" for Core/Carton — if any of
        // these changed (not just qty), the old delta-only approach would
        // silently move stock into the wrong brand/spec's bucket instead
        // of the one it was actually taken from.
        const specKey = (i) =>
          i.mainCategory === 'Core'   ? `Core|${i.brand}|${i.side}|${i.ply}` :
          i.mainCategory === 'Carton' ? `Carton|${i.brand}|${i.cartonType}|${i.size}` :
          null; // Jambo isn't spec-matched here — it's tracked by inventoryId instead.

        for (const [id, newItem] of newById) {
          const oldItem = oldById.get(id);
          const oldQty = oldItem ? (Number(oldItem.qty) || 0) : 0;
          const newQty = Number(newItem.qty) || 0;
          if (oldItem && newItem.mainCategory !== 'Jambo' && specKey(oldItem) !== specKey(newItem)) {
            // Brand/spec changed — fully reverse from the old spec, fully
            // apply to the new one, instead of delta-ing the wrong row.
            await applyPurchaseItemDelta(oldItem, -oldQty);
            await applyPurchaseItemDelta(newItem, newQty);
          } else {
            await applyPurchaseItemDelta(newItem, newQty - oldQty);
          }
        }
        for (const [id, oldItem] of oldById) {
          if (!newById.has(id)) {
            await applyPurchaseItemDelta(oldItem, -(Number(oldItem.qty) || 0));
          }
        }
      }
      // Sale bills: inventory is driven by bill.cartonUsed, a separate
      // field this edit UI doesn't expose — so line-item edits here never
      // touch inventory, correctly matching what SaleInvoice.jsx itself did.

      await syncLedgerAmount(bill, grandTotal);
      await updateBill(editId, { ...editData, items: recomputedItems, grandTotal, totalCartonCount });
      cancelEdit();
    } catch (err) {
      setActionErr('❌ Save failed: ' + err.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (bill) => {
    const key = getBillKey(bill);
    if (!window.confirm('Bill permanently delete karna hai? Stock aur ledger bhi automatically reverse ho jayega.')) return;

    setBusyId(key); setActionErr('');
    try {
      if (bill.billType === 'Purchase') {
        for (const item of (bill.items || [])) {
          await applyPurchaseItemDelta(item, -(Number(item.qty) || 0));
        }
      } else if (bill.billType === 'Sale' && bill.cartonUsed?.brand) {
        // Restore the carton stock this sale had deducted.
        const c = bill.cartonUsed;
        await upsertStock(
          { brand: c.brand, category: 'Carton', carton_type: c.type || c.cartonType, size: c.size },
          Number(c.qty) || 0
        );
      }

      const entry = getLedgerEntryForBill(key);
      if (entry) await deleteEntry(entry._id || entry.id);

      await deleteBill(key);
    } catch (err) {
      setActionErr('❌ Delete failed: ' + err.message);
    } finally {
      setBusyId(null);
    }
  };

  const updateEditItem = (idx, key, val) => {
    setEditData(prev => {
      const items = [...prev.items];
      items[idx] = { ...items[idx], [key]: val };
      return { ...prev, items };
    });
  };

  const removeEditItem = (idx) => {
    setEditData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx)
    }));
  };

  const addNewItem = () => {
    if (!newItemForm.rate) return;
    const totalQty = (parseFloat(newItemForm.totalCarton)||0) * (parseFloat(newItemForm.perCtnQty)||0);
    const total    = totalQty * (parseFloat(newItemForm.rate)||0);
    const sizeLabel = [
      newItemForm.sizeMm    ? `${newItemForm.sizeMm}mm`  : '',
      newItemForm.sizeInch  ? `${newItemForm.sizeInch}`  : '',
      newItemForm.yards     ? `${newItemForm.yards}yds`  : '',
    ].filter(Boolean).join(' / ');
    setEditData(prev => ({
      ...prev,
      items: [...prev.items, { ...newItemForm, id: Date.now(), sizeLabel, totalQty, total }]
    }));
    setNewItemForm(emptyItem);
    setAddingItem(false);
  };

  const liveTotal = (data) =>
    (data.items || []).reduce((s, i) =>
      s + (data.billType === 'Sale'
        ? (parseFloat(i.totalCarton)||0) * (parseFloat(i.perCtnQty)||0) * (parseFloat(i.rate)||0)
        : (parseFloat(i.qty)||0) * (parseFloat(i.rate)||0)
      ), 0);

  const getBillKey = (b) => b._id || b.id;

  // Extracted so the exact same bill card can be reused under both the
  // "Sale Bills" and "Purchase Bills" sub-sections of each party group
  // below, instead of duplicating this ~300-line block. Nothing about
  // what it renders or how editing/delete/print work has changed.
  const renderBillCard = (bill) => {
            const key       = getBillKey(bill);
            const isEditing = editId === key;
            const curItems  = isEditing ? editData.items : (bill.items || []);
            const curTotal  = isEditing ? liveTotal(editData) : (bill.grandTotal || 0);

            return (
              <div key={key}
                className={`bg-white/[0.03] rounded-2xl border overflow-hidden transition ${
                  isEditing ? 'border-[#22c55e]/50' : 'border-white/10 hover:border-white/20'
                }`}>

                {/* ── Bill header ── */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-white/5">
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Type badge */}
                    <span className={`text-xs font-black px-3 py-1 rounded-full shrink-0 ${
                      bill.billType === 'Sale'
                        ? 'bg-[#22c55e]/10 text-[#22c55e]'
                        : 'bg-blue-500/10 text-blue-400'
                    }`}>
                      {bill.billType}
                    </span>

                    {isEditing ? (
                      /* Edit mode header fields */
                      <div className="flex flex-wrap gap-3">
                        {[
                          { label:'Bill #', key:'billNo',    w:'w-24' },
                          { label:'Party',  key:'partyName', w:'w-36' },
                          { label:'Date',   key:'date',      w:'w-28' },
                        ].map(({ label, key: k, w }) => (
                          <div key={k}>
                            <p className="text-[9px] text-gray-500 uppercase mb-0.5">{label}</p>
                            <input
                              value={editData[k] || ''}
                              onChange={e => setEditData(p => ({ ...p, [k]: e.target.value }))}
                              className={`bg-black/30 p-1.5 rounded-lg border border-[#22c55e]/30 outline-none text-sm ${w}`}
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div>
                        <p className="font-black text-sm">
                          {bill.partyName}
                          <span className="text-gray-500 font-normal text-xs ml-2">#{bill.billNo}</span>
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">{bill.date}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-black text-[#22c55e] mr-1">{curTotal.toLocaleString()}</p>

                    {/* ✅ Print button — har bill ka apna */}
                    {!isEditing && bill.billType === 'Sale' && (
                      <button
                        onClick={() => printBill(bill)}
                        title="Print / Save PDF"
                        className="text-gray-400 hover:text-[#22c55e] transition p-1.5 rounded-lg hover:bg-[#22c55e]/10"
                      >
                        <Printer size={15}/>
                      </button>
                    )}

                    {isEditing ? (
                      <>
                        <button onClick={saveEdit} disabled={busyId === key} className="text-[#22c55e] hover:text-white transition p-1.5 rounded-lg hover:bg-[#22c55e]/10 disabled:opacity-40">
                          <Check size={16}/>
                        </button>
                        <button onClick={cancelEdit} disabled={busyId === key} className="text-gray-400 hover:text-red-500 transition p-1.5 rounded-lg hover:bg-red-500/10 disabled:opacity-40">
                          <X size={16}/>
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => startEdit(bill)} disabled={busyId === key} className="text-gray-400 hover:text-[#22c55e] transition p-1.5 rounded-lg hover:bg-[#22c55e]/10 disabled:opacity-40">
                          <Pencil size={15}/>
                        </button>
                        <button
                          onClick={() => handleDelete(bill)}
                          disabled={busyId === key}
                          className="text-gray-400 hover:text-red-500 transition p-1.5 rounded-lg hover:bg-red-500/10 disabled:opacity-40"
                        >
                          <Trash2 size={15}/>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* ── Items table ── */}
                <div className="overflow-x-auto">
                  {bill.billType === 'Sale' ? (
                    <table className="w-full text-left text-xs min-w-[700px]">
                      <thead className="bg-black/20 text-gray-500 uppercase">
                        <tr>
                          <th className="p-2.5">#</th>
                          <th className="p-2.5">Size</th>
                          <th className="p-2.5">Colour</th>
                          <th className="p-2.5">Brand</th>
                          <th className="p-2.5">MIC</th>
                          <th className="p-2.5 text-center">Total CTN</th>
                          <th className="p-2.5 text-center">Per CTN</th>
                          <th className="p-2.5 text-center">Total Qty</th>
                          <th className="p-2.5 text-right">Rate</th>
                          <th className="p-2.5 text-right">Total</th>
                          {isEditing && <th className="p-2.5 w-8"></th>}
                        </tr>
                      </thead>
                      <tbody>
                        {curItems.map((item, idx) => {
                          const sizeDisplay = item.sizeLabel || [
                            item.sizeMm   ? `${item.sizeMm}mm`  : '',
                            item.sizeInch ? `${item.sizeInch}`  : '',
                            item.yards    ? `${item.yards}yds`  : '',
                          ].filter(Boolean).join(' / ') || item.size || '—';

                          return (
                            <tr key={item.id || idx} className="border-t border-white/5 hover:bg-white/[0.02]">
                              <td className="p-2.5 text-gray-500">{idx+1}</td>

                              {isEditing ? (
                                <>
                                  {/* Size mm */}
                                  <td className="p-1.5">
                                    <div className="flex gap-1">
                                      <input value={item.sizeMm||''}
                                        onChange={e=>updateEditItem(idx,'sizeMm',e.target.value)}
                                        placeholder="mm"
                                        className="bg-black/30 p-1.5 rounded border border-[#22c55e]/20 outline-none w-16 text-xs"/>
                                      <input value={item.sizeInch||''}
                                        onChange={e=>updateEditItem(idx,'sizeInch',e.target.value)}
                                        placeholder="inch"
                                        className="bg-black/30 p-1.5 rounded border border-[#22c55e]/20 outline-none w-14 text-xs"/>
                                    </div>
                                  </td>
                                  {['colour','brand','micron'].map(k=>(
                                    <td key={k} className="p-1.5">
                                      <input value={item[k]||''}
                                        onChange={e=>updateEditItem(idx,k,e.target.value)}
                                        className="bg-black/30 p-1.5 rounded border border-[#22c55e]/20 outline-none w-full text-xs"/>
                                    </td>
                                  ))}
                                  {['totalCarton','perCtnQty'].map(k=>(
                                    <td key={k} className="p-1.5 text-center">
                                      <input type="number" value={item[k]||''}
                                        onChange={e=>updateEditItem(idx,k,e.target.value)}
                                        className="bg-black/30 p-1.5 rounded border border-[#22c55e]/20 outline-none w-16 text-center text-xs"/>
                                    </td>
                                  ))}
                                  <td className="p-1.5 text-center text-[#22c55e] font-bold">
                                    {(parseFloat(item.totalCarton)||0)*(parseFloat(item.perCtnQty)||0)}
                                  </td>
                                  <td className="p-1.5 text-right">
                                    <input type="number" value={item.rate||''}
                                      onChange={e=>updateEditItem(idx,'rate',e.target.value)}
                                      className="bg-black/30 p-1.5 rounded border border-[#22c55e]/20 outline-none w-20 text-right text-xs"/>
                                  </td>
                                  <td className="p-1.5 text-right font-bold">
                                    {((parseFloat(item.totalCarton)||0)*(parseFloat(item.perCtnQty)||0)*(parseFloat(item.rate)||0)).toLocaleString()}
                                  </td>
                                  <td className="p-1.5">
                                    <button onClick={()=>removeEditItem(idx)} className="text-gray-400 hover:text-red-500">
                                      <Trash2 size={12}/>
                                    </button>
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td className="p-2.5 font-mono">{sizeDisplay}</td>
                                  <td className="p-2.5">{item.colour}</td>
                                  <td className="p-2.5">{item.brand}</td>
                                  <td className="p-2.5">{item.micron}</td>
                                  <td className="p-2.5 text-center">{item.totalCarton}</td>
                                  <td className="p-2.5 text-center">{item.perCtnQty}</td>
                                  <td className="p-2.5 text-center text-[#22c55e] font-bold">{item.totalQty}</td>
                                  <td className="p-2.5 text-right">{(item.rate||0).toLocaleString()}</td>
                                  <td className="p-2.5 text-right font-bold">{(item.total||0).toLocaleString()}</td>
                                </>
                              )}
                            </tr>
                          );
                        })}

                        {/* Add new item row in edit mode */}
                        {isEditing && (
                          addingItem ? (
                            <tr className="border-t border-[#22c55e]/20 bg-[#22c55e]/5">
                              <td className="p-1.5 text-gray-500 text-xs">new</td>
                              <td className="p-1.5">
                                <div className="flex gap-1">
                                  <input value={newItemForm.sizeMm||''}
                                    onChange={e=>setNewItemForm(p=>({...p,sizeMm:e.target.value}))}
                                    placeholder="mm"
                                    className="bg-black/30 p-1.5 rounded border border-[#22c55e]/20 outline-none w-16 text-xs"/>
                                  <input value={newItemForm.sizeInch||''}
                                    onChange={e=>setNewItemForm(p=>({...p,sizeInch:e.target.value}))}
                                    placeholder="inch"
                                    className="bg-black/30 p-1.5 rounded border border-[#22c55e]/20 outline-none w-14 text-xs"/>
                                </div>
                              </td>
                              {['colour','brand','micron','totalCarton','perCtnQty'].map(k=>(
                                <td key={k} className="p-1.5">
                                  <input value={newItemForm[k]||''}
                                    onChange={e=>setNewItemForm(p=>({...p,[k]:e.target.value}))}
                                    placeholder={k} type={['totalCarton','perCtnQty'].includes(k)?'number':'text'}
                                    className="bg-black/30 p-1.5 rounded border border-[#22c55e]/20 outline-none w-full text-xs"/>
                                </td>
                              ))}
                              <td className="p-1.5 text-center text-gray-500 text-xs">—</td>
                              <td className="p-1.5">
                                <input type="number" value={newItemForm.rate||''}
                                  onChange={e=>setNewItemForm(p=>({...p,rate:e.target.value}))}
                                  placeholder="Rate"
                                  className="bg-black/30 p-1.5 rounded border border-[#22c55e]/20 outline-none w-20 text-xs"/>
                              </td>
                              <td className="p-1.5 text-center text-gray-500 text-xs">—</td>
                              <td className="p-1.5">
                                <div className="flex gap-1">
                                  <button onClick={addNewItem} className="text-[#22c55e] hover:text-white"><Check size={12}/></button>
                                  <button onClick={()=>setAddingItem(false)} className="text-gray-400 hover:text-red-500"><X size={12}/></button>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            <tr className="border-t border-white/5">
                              <td colSpan={11} className="p-2">
                                <button onClick={()=>setAddingItem(true)}
                                  className="text-xs text-[#22c55e] flex items-center gap-1 hover:text-white transition">
                                  <Plus size={12}/> Add Item
                                </button>
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  ) : (
                    /* Purchase bill items */
                    <table className="w-full text-left text-xs min-w-[760px]">
                      <thead className="bg-black/20 text-gray-500 uppercase">
                        <tr>
                          <th className="p-2.5">Category</th>
                          <th className="p-2.5">Specs</th>
                          <th className="p-2.5">Qty</th>
                          <th className="p-2.5">Rate</th>
                          <th className="p-2.5 text-right">Amount</th>
                          {isEditing && <th className="p-2.5 w-8"></th>}
                        </tr>
                      </thead>
                      <tbody>
                        {curItems.map((item, idx) => (
                          <tr key={item.id||idx} className="border-t border-white/5 hover:bg-white/[0.02]">
                            {isEditing ? (
                              <>
                                <td className="p-1.5 text-gray-400 text-xs">{item.mainCategory}</td>
                                <td className="p-1.5">
                                  <div className="flex flex-wrap gap-1">
                                    {item.mainCategory === 'Core' && (
                                      <>
                                        <input list="pb-brand-list" value={item.brand||''}
                                          onChange={e=>updateEditItem(idx,'brand',e.target.value)}
                                          placeholder="Brand"
                                          className="bg-black/30 p-1.5 rounded border border-[#22c55e]/20 outline-none w-20 text-xs"/>
                                        <select value={item.side||''} onChange={e=>updateEditItem(idx,'side',e.target.value)}
                                          className="bg-black/30 p-1.5 rounded border border-[#22c55e]/20 outline-none text-xs">
                                          <option value="">Side</option><option value="Single">Single</option><option value="Double">Double</option>
                                        </select>
                                        <select value={item.ply||''} onChange={e=>updateEditItem(idx,'ply',e.target.value)}
                                          className="bg-black/30 p-1.5 rounded border border-[#22c55e]/20 outline-none text-xs">
                                          <option value="">Ply</option>{plyOptions.map(p=><option key={p} value={p}>{p} Ply</option>)}
                                        </select>
                                      </>
                                    )}
                                    {item.mainCategory === 'Carton' && (
                                      <>
                                        <input list="pb-brand-list" value={item.brand||''}
                                          onChange={e=>updateEditItem(idx,'brand',e.target.value)}
                                          placeholder="Brand"
                                          className="bg-black/30 p-1.5 rounded border border-[#22c55e]/20 outline-none w-20 text-xs"/>
                                        <select value={item.cartonType||''} onChange={e=>updateEditItem(idx,'cartonType',e.target.value)}
                                          className="bg-black/30 p-1.5 rounded border border-[#22c55e]/20 outline-none text-xs">
                                          <option value="">Type</option><option value="Small">Small</option><option value="Large">Large</option>
                                        </select>
                                        <select value={item.size||''} onChange={e=>updateEditItem(idx,'size',e.target.value)}
                                          className="bg-black/30 p-1.5 rounded border border-[#22c55e]/20 outline-none text-xs">
                                          <option value="">Size</option>{cartonSizeOptions.map(s=><option key={s} value={s}>{s}"</option>)}
                                        </select>
                                      </>
                                    )}
                                    {item.mainCategory === 'Jambo' && (
                                      <>
                                        <select value={item.jamboCategory||''} onChange={e=>updateEditItem(idx,'jamboCategory',e.target.value)}
                                          className="bg-black/30 p-1.5 rounded border border-[#22c55e]/20 outline-none text-xs">
                                          <option value="">Type</option>{JAMBO_CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
                                        </select>
                                        <input value={item.micron||''} onChange={e=>updateEditItem(idx,'micron',e.target.value)}
                                          placeholder="Micron" className="bg-black/30 p-1.5 rounded border border-[#22c55e]/20 outline-none w-14 text-xs"/>
                                        <input value={item.width||''} onChange={e=>updateEditItem(idx,'width',e.target.value)}
                                          placeholder="Width" className="bg-black/30 p-1.5 rounded border border-[#22c55e]/20 outline-none w-14 text-xs"/>
                                        <input value={item.color||''} onChange={e=>updateEditItem(idx,'color',e.target.value)}
                                          placeholder="Color" className="bg-black/30 p-1.5 rounded border border-[#22c55e]/20 outline-none w-16 text-xs"/>
                                        <input type="number" value={item.weight||''} onChange={e=>updateEditItem(idx,'weight',e.target.value)}
                                          placeholder="Weight(kg)" className="bg-black/30 p-1.5 rounded border border-[#22c55e]/20 outline-none w-16 text-xs"/>
                                      </>
                                    )}
                                  </div>
                                </td>
                                <td className="p-1.5">
                                  <input type="number" value={item.qty||''}
                                    onChange={e=>updateEditItem(idx,'qty',e.target.value)}
                                    className="bg-black/30 p-1.5 rounded border border-[#22c55e]/20 outline-none w-16 text-xs"/>
                                </td>
                                <td className="p-1.5">
                                  <input type="number" value={item.rate||''}
                                    onChange={e=>updateEditItem(idx,'rate',e.target.value)}
                                    className="bg-black/30 p-1.5 rounded border border-[#22c55e]/20 outline-none w-20 text-xs"/>
                                </td>
                                <td className="p-1.5 text-right font-bold text-xs">
                                  {((parseFloat(item.qty)||0)*(parseFloat(item.rate)||0)).toLocaleString()}
                                </td>
                                <td className="p-1.5">
                                  <button onClick={()=>removeEditItem(idx)} className="text-gray-400 hover:text-red-500"><Trash2 size={12}/></button>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="p-2.5 text-[#22c55e]">{item.mainCategory}</td>
                                <td className="p-2.5 font-mono text-gray-300">{item.specsLabel}</td>
                                <td className="p-2.5">{item.qty}</td>
                                <td className="p-2.5">{item.rate}</td>
                                <td className="p-2.5 text-right font-bold">{(item.amount||0).toLocaleString()}</td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* ── Bill footer ── */}
                <div className="p-3 flex flex-wrap justify-between items-center gap-2 border-t border-white/5 bg-black/10">
                  <p className="text-xs text-gray-500 capitalize">{toWords(curTotal)}</p>
                  <p className="font-black text-[#22c55e]">{curTotal.toLocaleString()}</p>
                </div>

              </div>
            );
  };

  // ── Render ─────────────────────────────────────────────
  return (
    <div className="text-white min-h-screen">

      <datalist id="pb-brand-list">
        {(brands||[]).map(b=><option key={b._id} value={b.name}/>)}
      </datalist>

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <FileText className="text-[#22c55e]" size={24}/>
        <div>
          <h1 className="text-2xl font-black">SAVED <span className="text-[#22c55e]">BILLS</span></h1>
          <p className="text-gray-500 text-xs mt-0.5">Sab bills ek jagah</p>
        </div>
      </div>

      {actionErr && (
        <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold">
          {actionErr}
        </div>
      )}

      {/* Search + Filter */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={15}/>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Party name ya bill # se search..."
            className="w-full pl-9 p-2.5 bg-white/[0.03] rounded-xl border border-[#22c55e]/20 outline-none focus:border-[#22c55e]/40 text-sm"
          />
        </div>
        <div className="flex gap-2">
          {['All','Sale','Purchase'].map(t => (
            <button key={t} onClick={() => setFilterType(t)}
              className={`px-4 py-2.5 rounded-xl font-bold text-sm border transition ${
                filterType === t
                  ? 'bg-[#22c55e] text-black border-[#22c55e]'
                  : 'bg-white/[0.03] text-gray-400 border-[#22c55e]/20 hover:border-[#22c55e]/50'
              }`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      {bills.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {[
            { label:'Total Bills',    value: bills.length },
            { label:'Sale Bills',     value: bills.filter(b=>b.billType==='Sale').length },
            { label:'Purchase Bills', value: bills.filter(b=>b.billType==='Purchase').length },
            { label:'Sale Revenue',   value: bills.filter(b=>b.billType==='Sale').reduce((s,b)=>s+(b.grandTotal||0),0).toLocaleString() },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white/[0.03] border border-[#22c55e]/10 rounded-2xl p-4">
              <p className="text-[10px] text-gray-500 uppercase font-bold">{label}</p>
              <p className="text-xl font-black text-[#22c55e] mt-1">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Bills list — grouped by party, so each party's Sale and Purchase
          bills sit together and clearly labeled instead of one long mixed
          chronological list. The "All/Sale/Purchase" filter above still
          works — it narrows which sub-section(s) show inside each party. */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <FileText size={40} className="mx-auto mb-3 opacity-20"/>
          <p>Koi bill nahi mila.</p>
          <p className="text-xs mt-1 text-gray-600">Sale ya Purchase invoice bana kar Save Bill dabao.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedByParty.map(([party, partyBills]) => {
            const saleBills     = partyBills.filter(b => b.billType === 'Sale');
            const purchaseBills = partyBills.filter(b => b.billType === 'Purchase');
            const saleTotal     = saleBills.reduce((s,b)=>s+(b.grandTotal||0),0);
            const purchaseTotal = purchaseBills.reduce((s,b)=>s+(b.grandTotal||0),0);
            const isOpen        = !collapsedParties.has(party);

            return (
              <div key={party} className="bg-white/[0.02] border border-white/10 rounded-[1.75rem] overflow-hidden">
                <button
                  onClick={() => toggleParty(party)}
                  className="w-full flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-white/[0.03] transition text-left"
                >
                  <div className="flex items-center gap-3">
                    <ChevronDown size={16} className={`text-gray-500 transition-transform ${isOpen ? '' : '-rotate-90'}`}/>
                    <Users size={16} className="text-[#22c55e]"/>
                    <span className="font-black text-sm">{party}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase">
                    {saleBills.length > 0 && (
                      <span className="px-2.5 py-1 rounded-full bg-[#22c55e]/10 text-[#22c55e]">{saleBills.length} Sale • Rs.{saleTotal.toLocaleString()}</span>
                    )}
                    {purchaseBills.length > 0 && (
                      <span className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400">{purchaseBills.length} Purchase • Rs.{purchaseTotal.toLocaleString()}</span>
                    )}
                  </div>
                </button>

                {isOpen && (
                  <div className="p-4 pt-0 space-y-5">
                    {saleBills.length > 0 && (
                      <div>
                        <p className="text-[10px] font-black text-[#22c55e] uppercase tracking-widest mb-2 pl-1">Sale Bills</p>
                        <div className="space-y-3">{saleBills.map(renderBillCard)}</div>
                      </div>
                    )}
                    {purchaseBills.length > 0 && (
                      <div>
                        <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2 pl-1">Purchase Bills</p>
                        <div className="space-y-3">{purchaseBills.map(renderBillCard)}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SavedBills;
