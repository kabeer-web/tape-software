import { useState, useContext, useRef, useEffect } from 'react';
import { StockContext } from '../StockContext';
import { useAccounts } from '../ACCOUNTS/AccountsContext';
import { getLedgerEntries } from '../../../api';
import {
  Plus, Trash2, Save, FileText, Package, Archive, Layers,
  Printer, Upload, X, ChevronDown
} from 'lucide-react';

// --- PARTIES LIST DIRECTLY INSIDE ---
const PURCHASE_PARTIES = [
  'UNIVERSAL COTTING','KOSHER','CHAWLA INDUSTRY',
  'IBAD CORE','TAHSEEN CARTON','TALHA WASEEM',
  'ASGHR CORE','DEER TAPE','SAMAD BHAI',
];

const JAMBO_CATEGORIES = ['Clear','Tan','Cloth','Masking','Tissue','SuperYellow','SuperClear','Color','Foam'];
const CARTON_SIZES = [10, 10.5, 11, 12];
const PLY_OPTIONS = [5, 6, 8, 10];

const emptyForm = {
  mainCategory: 'Core',
  brand:'', side:'', ply:'',
  cartonType:'', size:'',
  jamboCategory:'', color:'', micron:'', width:'',
  qty:'', rate:''
};

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
          className="w-full mt-1 bg-black/30 p-2.5 rounded-xl border border-[#22c55e]/20 outline-none focus:border-[#22c55e]/50 text-sm pr-8"
        />
        <ChevronDown size={14} className="absolute right-3 top-[22px] text-gray-500 pointer-events-none" />
      </div>
      {open && (
        <div className="absolute z-30 mt-1 w-full max-h-52 overflow-y-auto bg-[#0c0c0c] border border-[#22c55e]/30 rounded-xl shadow-2xl">
          {filtered.length === 0 && (
            <p className="px-3 py-2.5 text-xs text-gray-500">Koi supplier nahi mila</p>
          )}
          {filtered.map(o => (
            <button
              key={o} type="button"
              onMouseDown={() => { onChange(o); onSelect && onSelect(o); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-[#22c55e]/10 hover:text-[#22c55e] transition border-b border-white/5 last:border-0"
            >
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
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
  const [savedOk, setSavedOk] = useState(true);
  const [logo, setLogo] = useState(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);
  const [partyBalance, setPartyBalance] = useState(null);
  const [balanceLoading, setBalanceLoading] = useState(false);

  const updateForm = (key, value) => setForm(prev => ({ ...prev, [key]: value }));
  const switchCategory = (cat) => setForm({ ...emptyForm, mainCategory: cat });

  const flash = (text, ok = true) => {
    setSavedMsg(text); setSavedOk(ok);
    setTimeout(() => setSavedMsg(''), 5000);
  };

  const fetchPartyBalance = async (name) => {
    if (!name || !name.trim()) { setPartyBalance(null); return; }
    setBalanceLoading(true);
    try {
      const entries = await getLedgerEntries(name.trim());
      const totalDebit  = entries.filter(e => e.entry_type === 'debit' ).reduce((s,e)=>s+(Number(e.amount)||0),0);
      const totalCredit = entries.filter(e => e.entry_type === 'credit').reduce((s,e)=>s+(Number(e.amount)||0),0);
      setPartyBalance({ balance: totalDebit - totalCredit });
    } catch (err) { setPartyBalance(null); } 
    finally { setBalanceLoading(false); }
  };

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
    if (!isFormValid()) { flash('❌ Sab required fields fill karein', false); return; }
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

  const handleSaveBill = async () => {
    if (!supplierName.trim()) { flash('❌ Supplier select/likhein', false); return; }
    if (rows.length === 0)    { flash('❌ Pehle koi item add karein', false); return; }
    if (!window.confirm(`${rows.length} items ki stock add ho jayegi. Confirm karein?`)) return;

    setSaving(true);
    try {
      // Stock Update
      for (const r of rows) {
        if (r.mainCategory === 'Core') {
          await addRoll({ category:'Core', brand:r.brand, side:r.side, ply:r.ply, qty:r.qty });
        } else if (r.mainCategory === 'Carton') {
          await addRoll({ category:'Carton', brand:r.brand, cartonType:r.cartonType, size:r.size, qty:r.qty });
        } else if (r.mainCategory === 'Jambo') {
          await addRoll({ category: r.jamboCategory, color: r.color, micron: r.micron, width: r.width, yards: r.qty });
        }
      }

      // Ledger Update via AccountsContext
      await saveBill({
        billType: 'Purchase', // This creates a Credit entry for the supplier
        billNo,
        partyName: supplierName,
        date,
        items: rows,
        grandTotal,
      });

      flash(`✅ Bill Saved & Ledger Updated!`);
      setRows([]); setBillNo(''); setSupplierName(''); setPartyBalance(null);
    } catch (err) { flash('❌ Error: ' + err.message, false); } 
    finally { setSaving(false); }
  };

  const printBill = () => {
    const rowsHtml = rows.map((r, idx) => `
      <tr><td>${idx+1}</td><td>${r.mainCategory}</td><td>${r.specsLabel}</td><td>${r.qty}</td><td>${r.rate.toLocaleString()}</td><td><b>${r.amount.toLocaleString()}</b></td></tr>
    `).join('');
    const win = window.open('', '_blank');
    win.document.write(`<html><body onload="window.print()"><h2>Purchase Bill #${billNo}</h2><p>Supplier: ${supplierName}</p><table border="1" width="100%"><thead><tr><th>#</th><th>Cat</th><th>Specs</th><th>Qty</th><th>Rate</th><th>Total</th></tr></thead><tbody>${rowsHtml}</tbody></table><h3>Grand Total: ${grandTotal.toLocaleString()}</h3></body></html>`);
    win.document.close();
  };

  return (
    <div className="text-white min-h-screen">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
        <div className="flex items-center gap-3">
          <FileText className="text-[#22c55e]" size={26} />
          <h1 className="text-2xl md:text-3xl font-black">PURCHASE <span className="text-[#22c55e]">INVOICE</span></h1>
        </div>
        <div className="flex gap-3">
          <button onClick={handleSaveBill} disabled={rows.length === 0 || saving} className="bg-white/[0.05] border border-[#22c55e]/30 text-[#22c55e] px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-[#22c55e]/10 transition disabled:opacity-30 text-sm">
            {saving ? <div className="w-4 h-4 border-2 border-t-transparent animate-spin rounded-full"/> : <Save size={15}/>} Save & Stock
          </button>
          <button onClick={printBill} disabled={rows.length === 0} className="bg-[#22c55e] text-black font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 hover:bg-[#1db954] transition disabled:opacity-30 text-sm"><Printer size={15}/> Print</button>
        </div>
      </div>

      {savedMsg && <div className={`p-3 rounded-xl mb-5 text-sm font-bold border ${savedOk ? 'bg-[#22c55e]/10 border-[#22c55e]/40 text-[#22c55e]' : 'bg-red-500/10 border-red-500/40 text-red-400'}`}>{savedMsg}</div>}

      <div className="bg-white/[0.03] backdrop-blur-xl p-6 rounded-2xl border border-[#22c55e]/20 mb-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="text-[10px] text-gray-500 uppercase font-bold">Supplier</label>
            <PartyPicker value={supplierName} onChange={setSupplierName} options={PURCHASE_PARTIES} placeholder="Select Supplier" onSelect={fetchPartyBalance} />
          </div>
          <div><label className="text-[10px] text-gray-500 uppercase font-bold">Bill #</label><input value={billNo} onChange={e=>setBillNo(e.target.value)} className="w-full mt-1 bg-black/30 p-2.5 rounded-xl border border-[#22c55e]/20 outline-none text-sm"/></div>
          <div><label className="text-[10px] text-gray-500 uppercase font-bold">Chalan</label><input value={chalanNo} onChange={e=>setChalanNo(e.target.value)} className="w-full mt-1 bg-black/30 p-2.5 rounded-xl border border-[#22c55e]/20 outline-none text-sm"/></div>
          <div><label className="text-[10px] text-gray-500 uppercase font-bold">Date</label><input value={date} onChange={e=>setDate(e.target.value)} className="w-full mt-1 bg-black/30 p-2.5 rounded-xl border border-[#22c55e]/20 outline-none text-sm"/></div>
        </div>
      </div>

      <div className="bg-white/[0.03] p-6 rounded-2xl border border-[#22c55e]/20 mb-5">
        <div className="flex gap-2 mb-4">
          {['Core','Carton','Jambo'].map(cat => (
            <button key={cat} onClick={()=>switchCategory(cat)} className={`px-4 py-2 rounded-xl text-sm font-bold border transition ${form.mainCategory===cat?'bg-[#22c55e] text-black':'bg-black/30 text-gray-400 border-white/10'}`}>{cat}</button>
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {form.mainCategory === 'Core' && (
            <><input value={form.brand} onChange={e=>updateForm('brand',e.target.value)} placeholder="Brand" className="bg-black/30 p-2.5 rounded-xl border border-[#22c55e]/20 outline-none text-sm"/><select value={form.side} onChange={e=>updateForm('side',e.target.value)} className="bg-black/30 p-2.5 rounded-xl border border-[#22c55e]/20 outline-none text-sm"><option value="">Side</option><option value="Single">Single</option><option value="Double">Double</option></select><select value={form.ply} onChange={e=>updateForm('ply',e.target.value)} className="bg-black/30 p-2.5 rounded-xl border border-[#22c55e]/20 outline-none text-sm"><option value="">Ply</option>{PLY_OPTIONS.map(p=><option key={p} value={p}>{p}</option>)}</select></>
          )}
          {form.mainCategory === 'Carton' && (
            <><input value={form.brand} onChange={e=>updateForm('brand',e.target.value)} placeholder="Brand" className="bg-black/30 p-2.5 rounded-xl border border-[#22c55e]/20 outline-none text-sm"/><select value={form.cartonType} onChange={e=>updateForm('cartonType',e.target.value)} className="bg-black/30 p-2.5 rounded-xl border border-[#22c55e]/20 outline-none text-sm"><option value="">Type</option><option value="Small">Small</option><option value="Large">Large</option></select><select value={form.size} onChange={e=>updateForm('size',e.target.value)} className="bg-black/30 p-2.5 rounded-xl border border-[#22c55e]/20 outline-none text-sm"><option value="">Size</option>{CARTON_SIZES.map(s=><option key={s} value={s}>{s}</option>)}</select></>
          )}
          {form.mainCategory === 'Jambo' && (
            <><select value={form.jamboCategory} onChange={e=>updateForm('jamboCategory',e.target.value)} className="bg-black/30 p-2.5 rounded-xl border border-[#22c55e]/20 outline-none text-sm"><option value="">Jambo Type</option>{JAMBO_CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}</select><input value={form.micron} onChange={e=>updateForm('micron',e.target.value)} placeholder="Micron" className="bg-black/30 p-2.5 rounded-xl border border-[#22c55e]/20 outline-none text-sm"/><input value={form.width} onChange={e=>updateForm('width',e.target.value)} placeholder="Width mm" className="bg-black/30 p-2.5 rounded-xl border border-[#22c55e]/20 outline-none text-sm"/></>
          )}
          <input type="number" value={form.qty} onChange={e=>updateForm('qty',e.target.value)} placeholder="Qty" className="bg-black/30 p-2.5 rounded-xl border border-[#22c55e]/20 outline-none text-sm"/>
          <input type="number" value={form.rate} onChange={e=>updateForm('rate',e.target.value)} placeholder="Rate" className="bg-black/30 p-2.5 rounded-xl border border-[#22c55e]/20 outline-none text-sm"/>
          <button onClick={addItem} disabled={!isFormValid()} className="bg-[#22c55e] text-black font-bold rounded-xl py-2.5 hover:bg-[#1db954] disabled:opacity-30"><Plus size={16} className="inline mr-1"/> Add</button>
        </div>
      </div>

      <div className="bg-white/[0.03] rounded-2xl border border-white/10 overflow-hidden mb-5">
        <table className="w-full text-left">
          <thead className="bg-black/30 text-gray-500 text-xs uppercase">
            <tr><th className="p-3">#</th><th className="p-3">Category</th><th className="p-3">Specs</th><th className="p-3">Qty</th><th className="p-3">Rate</th><th className="p-3">Total</th><th className="p-3"></th></tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                <td className="p-3 text-xs text-gray-500">{i+1}</td>
                <td className="p-3 text-[#22c55e] font-bold text-sm">{r.mainCategory}</td>
                <td className="p-3 text-sm text-gray-300 font-mono">{r.specsLabel}</td>
                <td className="p-3 text-sm">{r.qty}</td>
                <td className="p-3 text-sm">{r.rate.toLocaleString()}</td>
                <td className="p-3 font-bold text-sm">{r.amount.toLocaleString()}</td>
                <td className="p-3"><button onClick={()=>removeRow(r.id)} className="text-gray-500 hover:text-red-500"><Trash2 size={15}/></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white/[0.03] p-5 rounded-2xl border border-[#22c55e]/20 flex justify-between items-center">
        <span className="text-xs text-gray-500 font-bold uppercase tracking-widest">Grand Total</span>
        <span className="text-3xl font-black text-[#22c55e]">Rs. {grandTotal.toLocaleString()}</span>
      </div>
    </div>
  );
};

export default PurchaseInvoice;
