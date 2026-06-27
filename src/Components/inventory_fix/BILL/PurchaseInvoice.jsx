import { useState, useContext, useRef } from 'react';
import { StockContext } from '../StockContext';
import { useAccounts } from "../ACCOUNTS/AccountsContext";
import { Plus, Trash2, Save, FileText, Package, Archive, Layers, Printer, Upload, X } from 'lucide-react';

const JAMBO_CATEGORIES = ['Clear','Tan','Cloth','Masking','Tissue','SuperYellow','SuperClear','Color','Foam'];
const CARTON_SIZES = [10, 10.5, 11, 12];
const PLY_OPTIONS = [6, 8, 10];

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
  const [savedMsg, setSavedMsg] = useState('');
  const [logo, setLogo] = useState(null);
  const fileRef = useRef(null);

  const updateForm = (key, value) => setForm(prev => ({ ...prev, [key]: value }));
  const switchCategory = (cat) => setForm({ ...emptyForm, mainCategory: cat });

  const buildSpecsLabel = (f) => {
    if (f.mainCategory === 'Core') return `${f.brand} / ${f.side} / ${f.ply} Ply`;
    if (f.mainCategory === 'Carton') return `${f.brand} / ${f.cartonType} / ${f.size}"`;
    return `${f.jamboCategory}${f.color?' / '+f.color:''}${f.micron?' / '+f.micron+'μ':''}${f.width?' / '+f.width+'mm':''}`;
  };

  const isFormValid = () => {
    const f = form;
    if (!f.qty || !f.rate) return false;
    if (f.mainCategory === 'Core') return f.brand && f.side && f.ply;
    if (f.mainCategory === 'Carton') return f.brand && f.cartonType && f.size;
    if (f.mainCategory === 'Jambo') return f.jamboCategory;
    return false;
  };

  const addItem = () => {
    if (!isFormValid()) return;
    const qty = parseFloat(form.qty);
    const rate = parseFloat(form.rate);
    const amount = qty * rate;
    setRows(prev => [...prev, {
      id: Date.now(), ...form, qty, rate, amount,
      specsLabel: buildSpecsLabel(form)
    }]);
    setForm({ ...emptyForm, mainCategory: form.mainCategory });
  };

  const removeRow = (id) => setRows(prev => prev.filter(r => r.id !== id));
  const grandTotal = rows.reduce((sum, r) => sum + r.amount, 0);

  const handleLogo = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setLogo(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSaveBill = () => {
    if (rows.length === 0) return;
    if (!window.confirm(`${rows.length} items ki stock add ho jayegi. Confirm karein?`)) return;

    rows.forEach(r => {
      if (r.mainCategory === 'Core')
        addRoll({ category:'Core', brand:r.brand, side:r.side, ply:r.ply, qty:r.qty });
      else if (r.mainCategory === 'Carton')
        addRoll({ category:'Carton', brand:r.brand, type:r.cartonType, size:r.size, qty:r.qty });
      else if (r.mainCategory === 'Jambo')
        addRoll({ type:r.jamboCategory, color:r.color||undefined, micron:r.micron||undefined, width:r.width||undefined, yards:r.qty });
    });

    // Ledger mein bhi save karo
    saveBill({
      billType: 'Purchase',
      billNo,
      partyName: supplierName || 'Unknown',
      date,
      items: rows,
      grandTotal
    });

    setSavedMsg(`Bill #${billNo||'—'} saved. ${rows.length} items ki stock update ho gayi.`);
    setRows([]);
    setBillNo(''); setSupplierName(''); setChalanNo('');
    setTimeout(() => setSavedMsg(''), 4000);
  };

  const printBill = () => {
    const logoHtml = logo
      ? `<img src="${logo}" style="height:70px;object-fit:contain;" />`
      : '<div style="font-size:22px;font-weight:900;">HS Packages</div>';

    const rowsHtml = rows.map((r, idx) => `
      <tr>
        <td>${idx+1}</td>
        <td>${r.mainCategory}</td>
        <td>${r.specsLabel}</td>
        <td>${r.qty}</td>
        <td>${r.rate.toLocaleString()}</td>
        <td><b>${r.amount.toLocaleString()}</b></td>
      </tr>
    `).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Purchase Invoice - ${billNo||''}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:Arial,sans-serif; font-size:11px; color:#000; padding:20px; }
    .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:16px; border-bottom:2px solid #000; padding-bottom:12px; }
    .company-info { font-size:10px; color:#333; margin-top:4px; }
    .invoice-title { font-size:20px; font-weight:900; }
    .meta-grid { display:grid; grid-template-columns:1fr 1fr 1fr 1fr; gap:10px; margin-bottom:16px; padding:10px; border:1px solid #ddd; border-radius:4px; }
    .meta-item label { font-size:9px; text-transform:uppercase; color:#666; display:block; }
    .meta-item span { font-size:12px; font-weight:700; }
    table { width:100%; border-collapse:collapse; margin-bottom:16px; }
    th { background:#222; color:#fff; padding:7px 8px; text-align:left; font-size:9px; text-transform:uppercase; }
    td { padding:7px 8px; border-bottom:1px solid #eee; font-size:10px; }
    tr:nth-child(even) td { background:#f9f9f9; }
    .total-box { display:flex; justify-content:flex-end; }
    .total-inner { border:2px solid #000; padding:12px 20px; display:flex; justify-content:space-between; gap:40px; align-items:center; border-radius:4px; }
    .total-inner label { font-size:9px; text-transform:uppercase; color:#666; }
    .total-inner span { font-size:22px; font-weight:900; }
    .signatures { display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-top:40px; }
    .sig { border-top:1px solid #000; padding-top:6px; font-size:10px; }
  </style>
</head>
<body>
  <div class="header">
    <div style="display:flex;align-items:center;gap:14px;">
      ${logoHtml}
      <div class="company-info">
        <div>PLOT #356-5, SECTOR 5-B, SAEEDABAD BALDIA TOWN KARACHI</div>
        <div>Phone: 0313-2400511 & 0308-7058453</div>
      </div>
    </div>
    <div class="invoice-title">PURCHASE INVOICE</div>
  </div>
  <div class="meta-grid">
    <div class="meta-item"><label>Supplier</label><span>${supplierName||'—'}</span></div>
    <div class="meta-item"><label>Bill #</label><span>${billNo||'—'}</span></div>
    <div class="meta-item"><label>Chalan No</label><span>${chalanNo||'—'}</span></div>
    <div class="meta-item"><label>Date</label><span>${date}</span></div>
  </div>
  <table>
    <thead><tr><th>#</th><th>Category</th><th>Specs</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
    <tbody>${rowsHtml}</tbody>
  </table>
  <div class="total-box">
    <div class="total-inner">
      <label>Grand Total</label>
      <span>${grandTotal.toLocaleString()}</span>
    </div>
  </div>
  <div class="signatures">
    <div class="sig">Authorised</div>
    <div class="sig">Receiver Name</div>
  </div>
  <script>window.onload=()=>{window.print();window.onafterprint=()=>window.close();}</script>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=900,height=700');
    win.document.write(html);
    win.document.close();
  };

  const categoryIcon = { Core: Package, Carton: Archive, Jambo: Layers };

  return (
    <div className="text-white min-h-screen">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 md:mb-8">
        <div className="flex items-center gap-3">
          <FileText className="text-[#22c55e]" size={26} />
          <h1 className="text-2xl md:text-3xl font-black">
            PURCHASE <span className="text-[#22c55e]">INVOICE</span>
          </h1>
        </div>
        <div className="flex gap-2 md:gap-3">
          <button
            onClick={handleSaveBill}
            disabled={rows.length === 0}
            className="bg-white/[0.05] border border-[#22c55e]/30 text-[#22c55e] px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-[#22c55e]/10 transition disabled:opacity-30 disabled:cursor-not-allowed text-sm"
          >
            <Save size={15} /> Save & Stock
          </button>
          <button
            onClick={printBill}
            disabled={rows.length === 0}
            className="bg-[#22c55e] text-black font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 hover:bg-[#1db954] transition disabled:opacity-30 disabled:cursor-not-allowed text-sm"
          >
            <Printer size={15} /> Print
          </button>
        </div>
      </div>

      {savedMsg && (
        <div className="bg-[#22c55e]/10 border border-[#22c55e]/40 text-[#22c55e] p-3 rounded-xl mb-5 text-sm font-bold">
          ✅ {savedMsg}
        </div>
      )}

      {/* Logo + Bill Header */}
      <div className="bg-white/[0.03] backdrop-blur-xl p-4 md:p-6 rounded-2xl border border-[#22c55e]/20 mb-5">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
          <div className="flex items-center gap-3 md:gap-4">
            {logo ? (
              <div className="relative group shrink-0">
                <img src={logo} alt="Logo" className="h-14 w-auto object-contain rounded-lg border border-white/10" />
                <button
                  onClick={() => { setLogo(null); if(fileRef.current) fileRef.current.value=''; }}
                  className="absolute -top-2 -right-2 bg-red-600 rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
                >
                  <X size={10} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="flex flex-col items-center justify-center gap-1 w-20 h-14 border-2 border-dashed border-[#22c55e]/30 rounded-xl text-[#22c55e]/60 hover:border-[#22c55e] hover:text-[#22c55e] transition shrink-0"
              >
                <Upload size={16} />
                <span className="text-[9px] font-bold">ADD LOGO</span>
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" onChange={handleLogo} className="hidden" />
            <div>
              <p className="font-black text-base md:text-lg">HS Packages</p>
              <p className="text-xs text-gray-500">PLOT #356-5, SECTOR 5-B, SAEEDABAD BALDIA TOWN KARACHI</p>
              <p className="text-xs text-gray-500">Phone: 0313-2400511 & 0308-7058453</p>
            </div>
          </div>
          <span className="text-lg font-black text-[#22c55e]">PURCHASE INVOICE</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label:'Supplier', value:supplierName, setter:setSupplierName, placeholder:'Supplier name' },
            { label:'Bill #',   value:billNo,       setter:setBillNo,       placeholder:'Bill number' },
            { label:'Chalan No',value:chalanNo,     setter:setChalanNo,     placeholder:'Chalan no' },
            { label:'Date',     value:date,         setter:setDate,         placeholder:'Date' },
          ].map(({ label, value, setter, placeholder }) => (
            <div key={label}>
              <label className="text-[10px] text-gray-500 uppercase font-bold">{label}</label>
              <input
                value={value}
                onChange={(e) => setter(e.target.value)}
                placeholder={placeholder}
                className="w-full mt-1 bg-black/30 p-2.5 rounded-xl border border-[#22c55e]/20 outline-none focus:border-[#22c55e]/50 text-sm"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Category + Item Form */}
      <div className="bg-white/[0.03] backdrop-blur-xl p-4 md:p-6 rounded-2xl border border-[#22c55e]/20 mb-5">
        <p className="text-[10px] text-gray-500 uppercase font-bold mb-3">Add Item</p>

        <div className="flex gap-2 mb-4 flex-wrap">
          {['Core','Carton','Jambo'].map(cat => {
            const Icon = categoryIcon[cat];
            const isActive = form.mainCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => switchCategory(cat)}
                className={`px-3 py-2 rounded-xl text-sm font-bold border flex items-center gap-2 transition ${
                  isActive ? 'bg-[#22c55e] text-black border-[#22c55e]' : 'bg-black/30 text-gray-400 border-[#22c55e]/20 hover:border-[#22c55e]/50'
                }`}
              >
                <Icon size={15} /> {cat}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {form.mainCategory === 'Core' && (<>
            <input value={form.brand} onChange={(e) => updateForm('brand', e.target.value)} placeholder="Brand" className="bg-black/30 p-2.5 rounded-xl border border-[#22c55e]/20 outline-none text-sm" />
            <select value={form.side} onChange={(e) => updateForm('side', e.target.value)} className="bg-black/30 p-2.5 rounded-xl border border-[#22c55e]/20 outline-none text-sm">
              <option value="">Side</option>
              <option value="Single">Single</option>
              <option value="Double">Double</option>
            </select>
            <select value={form.ply} onChange={(e) => updateForm('ply', e.target.value)} className="bg-black/30 p-2.5 rounded-xl border border-[#22c55e]/20 outline-none text-sm">
              <option value="">Ply</option>
              {PLY_OPTIONS.map(p => <option key={p} value={p}>{p} Ply</option>)}
            </select>
            <input type="number" value={form.qty} onChange={(e) => updateForm('qty', e.target.value)} placeholder="Qty (Cores)" className="bg-black/30 p-2.5 rounded-xl border border-[#22c55e]/20 outline-none text-sm" />
          </>)}

          {form.mainCategory === 'Carton' && (<>
            <input value={form.brand} onChange={(e) => updateForm('brand', e.target.value)} placeholder="Brand" className="bg-black/30 p-2.5 rounded-xl border border-[#22c55e]/20 outline-none text-sm" />
            <select value={form.cartonType} onChange={(e) => updateForm('cartonType', e.target.value)} className="bg-black/30 p-2.5 rounded-xl border border-[#22c55e]/20 outline-none text-sm">
              <option value="">Type</option>
              <option value="Small">Small</option>
              <option value="Large">Large</option>
            </select>
            <select value={form.size} onChange={(e) => updateForm('size', e.target.value)} className="bg-black/30 p-2.5 rounded-xl border border-[#22c55e]/20 outline-none text-sm">
              <option value="">Size</option>
              {CARTON_SIZES.map(s => <option key={s} value={s}>{s}"</option>)}
            </select>
            <input type="number" value={form.qty} onChange={(e) => updateForm('qty', e.target.value)} placeholder="Qty (Cartons)" className="bg-black/30 p-2.5 rounded-xl border border-[#22c55e]/20 outline-none text-sm" />
          </>)}

          {form.mainCategory === 'Jambo' && (<>
            <select value={form.jamboCategory} onChange={(e) => updateForm('jamboCategory', e.target.value)} className="bg-black/30 p-2.5 rounded-xl border border-[#22c55e]/20 outline-none text-sm">
              <option value="">Type</option>
              {JAMBO_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input value={form.color} onChange={(e) => updateForm('color', e.target.value)} placeholder="Color (optional)" className="bg-black/30 p-2.5 rounded-xl border border-[#22c55e]/20 outline-none text-sm" />
            <input value={form.micron} onChange={(e) => updateForm('micron', e.target.value)} placeholder="Micron" className="bg-black/30 p-2.5 rounded-xl border border-[#22c55e]/20 outline-none text-sm" />
            <input value={form.width} onChange={(e) => updateForm('width', e.target.value)} placeholder="Width (mm)" className="bg-black/30 p-2.5 rounded-xl border border-[#22c55e]/20 outline-none text-sm" />
            <input type="number" value={form.qty} onChange={(e) => updateForm('qty', e.target.value)} placeholder="Yards" className="bg-black/30 p-2.5 rounded-xl border border-[#22c55e]/20 outline-none text-sm" />
          </>)}

          <input type="number" value={form.rate} onChange={(e) => updateForm('rate', e.target.value)} placeholder="Rate" className="bg-black/30 p-2.5 rounded-xl border border-[#22c55e]/20 outline-none text-sm" />
          <button
            onClick={addItem}
            disabled={!isFormValid()}
            className="bg-[#22c55e] text-black font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-[#1db954] disabled:opacity-30 disabled:cursor-not-allowed col-span-2 md:col-span-1 py-2.5 text-sm"
          >
            <Plus size={16} /> Add Item
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white/[0.03] backdrop-blur-xl rounded-3xl border border-[#22c55e]/10 overflow-x-auto mb-5">
        <table className="w-full text-left min-w-[600px]">
          <thead className="bg-black/30 text-gray-500 text-xs uppercase">
            <tr>
              <th className="p-3">#</th>
              <th className="p-3">Category</th>
              <th className="p-3">Specs</th>
              <th className="p-3">Qty</th>
              <th className="p-3">Rate</th>
              <th className="p-3">Amount</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={7} className="p-8 text-center text-gray-500">Koi item add nahi hua.</td></tr>
            ) : rows.map((r, idx) => (
              <tr key={r.id} className="border-t border-[#22c55e]/5 hover:bg-white/[0.02]">
                <td className="p-3 text-gray-500 text-sm">{idx+1}</td>
                <td className="p-3 text-[#22c55e] font-bold text-sm">{r.mainCategory}</td>
                <td className="p-3 text-sm text-gray-300 font-mono">{r.specsLabel}</td>
                <td className="p-3 text-sm">{r.qty}</td>
                <td className="p-3 text-sm">{r.rate.toLocaleString()}</td>
                <td className="p-3 font-bold text-sm">{r.amount.toLocaleString()}</td>
                <td className="p-3">
                  <button onClick={() => removeRow(r.id)} className="text-gray-400 hover:text-red-500">
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Grand Total */}
      <div className="flex items-center justify-between bg-white/[0.03] backdrop-blur-xl p-5 rounded-2xl border border-[#22c55e]/20">
        <p className="text-xs text-gray-500 uppercase font-bold">Grand Total</p>
        <p className="text-2xl md:text-3xl font-black text-[#22c55e]">{grandTotal.toLocaleString()}</p>
      </div>
    </div>
  );
};

export default PurchaseInvoice;