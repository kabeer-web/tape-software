import { useState, useRef, useContext, useEffect, useMemo } from 'react';
import {
  Plus, Trash2, Printer, Upload, X, CheckCircle2, Database,
  AlertTriangle, ChevronDown
} from 'lucide-react';
import { useAccounts } from '../ACCOUNTS/AccountsContext';
import { StockContext } from '../StockContext';
import { getLedgerEntries } from '../../../api';

// --- SALE PARTIES DIRECTLY INSIDE ---
const SALE_PARTIES = [
  'AR PACKAGES','ROSHAN TRADER','HUZAIFA TRADER','SHAMS STATIONARY',
  'ABDUL RAUF','HAMZULLAH','ANEES STATIONARY','A ONE',
  'ZEESHAN HYD','ABDUL BASIT','MD TRADERS','MUNEER BHAI',
  'ANWAR BHAI','FAROOQ BHAI','GR TRADER','HAMZA SIALKOT',
  'HASHMI TRADER','GAIN TEX INTERNATIONAL','NAQI TAQI',
  'MEMON ELECTRIC','MOK PAKISTAN TRADER','SABIR BROTHER 1',
  'SABIR BROTHER 2','SHERAZ HABIB','SANAULLAH TEXTILE',
  'SUJJAD ALI','USAMA STATIONARY','ZEESHAN HAIDRABAD',
  'WAHEED WALI','AL FAREED','SHOKAT HAYAT','GUL AMIR',
  'AJ ARSALAN','HAS GR TRADER','MUDASIR MEMON',
  'UMAIR FISHERY','AMEER AKBAR','ISMAIL BHAI',
  'BILAL BHAI','FARHAN NEW KARACHI','N.K ENTERPRISES',
];

const COLOURS = ['Clear','Tan','Cloth','Masking','Tissue','Super Yellow','Super Clear','Color','Foam','Black','White','Brown','Silver'];
const BRANDS  = ['Tesco','Bell','Race','Jhonson','HS Packages','Local','Imported'];
const MICRONS = ['37μ','39μ','40μ','42μ','43μ','44μ','45μ','48μ'];
const SIZE_MM = ['720','900','1280','1600','2400'];
const SIZE_INCH = ['1/2"','1"','2"','3"','4"','6"'];
const CARTON_SIZES = ['10','10.5','11','12'];

const ones = ['','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
const tens  = ['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
function numToWords(n) {
  if (n===0) return 'zero';
  if (n<20) return ones[n];
  if (n<100) return tens[Math.floor(n/10)]+(n%10?' '+ones[n%10]:'');
  if (n<1000) return ones[Math.floor(n/100)]+' hundred'+(n%100?' '+numToWords(n%100):'');
  if (n<100000) return numToWords(Math.floor(n/1000))+' thousand'+(n%1000?' '+numToWords(n%1000):'');
  return numToWords(Math.floor(n/100000))+' lac'+(n%100000?' '+numToWords(n%100000):'');
}
const toWords = (n) => {
  const r = Math.round(n);
  if (!r) return 'Zero Rupees Only';
  const w = numToWords(r);
  return w[0].toUpperCase() + w.slice(1) + ' Rupees Only';
};

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

const PartyPicker = ({ value, onChange, options, placeholder, onSelect, onBlur }) => {
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);
  useEffect(() => {
    const onClick = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);
  const filtered = (value || '').trim() === '' ? options : options.filter(o => o.toLowerCase().includes(value.toLowerCase()));
  return (
    <div className="relative" ref={boxRef}>
      <input value={value} onChange={e => { onChange(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onBlur={() => onBlur && onBlur(value)} placeholder={placeholder} className="w-full bg-black/40 p-4 rounded-2xl border border-white/5 outline-none focus:border-emerald-500 text-white font-bold" />
      {open && (
        <div className="absolute z-30 mt-1.5 w-full max-h-56 overflow-y-auto bg-[#0c0c0c] border border-[#22c55e]/30 rounded-xl shadow-2xl">
          {filtered.map(o => (
            <button key={o} onMouseDown={() => { onChange(o); onSelect && onSelect(o); setOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-[#22c55e]/10 border-b border-white/5">{o}</button>
          ))}
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
  const [logo, setLogo] = useState(null);
  const [popMsg, setPopMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ sizeUnit: 'mm', sizeMm: '', sizeInch: '', yards: '', colour: '', brand: '', micron: '', totalCarton: '', perCtnQty: '', rate: '', cartonType: 'Small', cartonSize: '10' });

  const flash = (text) => { setPopMsg(text); setTimeout(() => setPopMsg(''), 6000); };
  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const matchedStock = useMemo(() => {
    if (!form.brand || !form.cartonSize) return null;
    return inventory.find(i => 
      i.category === 'Carton' && String(i.brand).toLowerCase() === String(form.brand).toLowerCase() && 
      (i.carton_type || i.type) === form.cartonType && parseFloat(i.size) === parseFloat(form.cartonSize)
    );
  }, [form.brand, form.cartonType, form.cartonSize, inventory]);

  const addItem = () => {
    if (!form.totalCarton || !form.rate) return;
    const tc = parseFloat(form.totalCarton);
    const pc = parseFloat(form.perCtnQty || 0);
    const sizeLabel = [form.sizeUnit === 'mm' ? `${form.sizeMm}mm` : `${form.sizeInch}"`, form.yards ? `${form.yards}yds` : ''].filter(Boolean).join(' / ');
    setRows(p => [...p, { id: Date.now(), ...form, sizeLabel, inventoryId: matchedStock?._id || matchedStock?.id, totalQty: tc * pc, total: (tc * pc) * parseFloat(form.rate) }]);
    setForm(prev => ({...prev, totalCarton: '', yards: '', rate: '', perCtnQty: ''}));
  };

  const handleSave = async () => {
    if (!buyerName.trim() || rows.length === 0) return;
    setSaving(true);
    try {
      await saveBill({
        billType: 'Sale', billNo, partyName: buyerName, date, items: rows,
        grandTotal: rows.reduce((s,r)=>s+r.total,0),
        totalCartonCount: rows.reduce((s,r)=>s+Number(r.totalCarton),0),
      });
      for (const row of rows) { if (row.inventoryId) await updateStock(row.inventoryId, -Number(row.totalCarton)); }
      flash(`✅ Bill #${billNo} Saved & Ledger Updated!`);
      setRows([]); setBillNo(''); setBuyerName(''); refreshInventory();
    } catch (err) { flash('❌ Error: ' + err.message); } 
    finally { setSaving(false); }
  };

  const grandTotal = rows.reduce((s, r) => s + r.total, 0);

  return (
    <div className="text-white min-h-screen pb-10 max-w-7xl mx-auto px-4">
      {popMsg && <div className="fixed top-10 right-10 z-50 p-5 rounded-2xl bg-[#10b981] text-black font-bold shadow-2xl border border-white/20">{popMsg}</div>}

      <div className="flex justify-between items-center mb-8 pt-8">
        <div><h1 className="text-4xl font-black italic text-[#10b981]">HS <span className="text-white">PACKAGES</span></h1></div>
        <div className="flex gap-3">
          <button onClick={handleSave} disabled={saving || rows.length === 0} className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-6 py-3 rounded-2xl font-black text-xs hover:bg-emerald-500 hover:text-black transition-all">SAVE TO DB</button>
        </div>
      </div>

      <div className="bg-white/[0.03] border border-white/10 p-8 rounded-[2.5rem] mb-6 flex gap-8 items-center backdrop-blur-xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1">
          <div><label className="text-[10px] text-gray-500 uppercase font-black ml-2">Invoice #</label><input value={billNo} onChange={e=>setBillNo(e.target.value)} placeholder="001" className="w-full bg-black/40 p-4 rounded-2xl border border-white/5 outline-none focus:border-emerald-500"/></div>
          <div><label className="text-[10px] text-gray-500 uppercase font-black ml-2">Customer</label><PartyPicker value={buyerName} onChange={setBuyerName} options={SALE_PARTIES} placeholder="Select Party" /></div>
          <div><label className="text-[10px] text-gray-500 uppercase font-black ml-2">Date</label><input value={date} onChange={e=>setDate(e.target.value)} className="w-full bg-black/40 p-4 rounded-2xl border border-white/5 outline-none"/></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 bg-white/[0.03] border border-white/10 p-8 rounded-[2.5rem]">
           <div className="flex bg-black/40 p-1 rounded-2xl w-fit mb-6">
              <button onClick={() => upd('sizeUnit', 'mm')} className={`px-8 py-2.5 text-[10px] font-black rounded-xl ${form.sizeUnit === 'mm' ? 'bg-[#10b981] text-black' : 'text-gray-500'}`}>MM</button>
              <button onClick={() => upd('sizeUnit', 'inch')} className={`px-8 py-2.5 text-[10px] font-black rounded-xl ${form.sizeUnit === 'inch' ? 'bg-[#10b981] text-black' : 'text-gray-500'}`}>Inches</button>
           </div>
           <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {form.sizeUnit === 'mm' ? <SelectOrCustom value={form.sizeMm} onChange={v=>upd('sizeMm',v)} options={SIZE_MM} placeholder="Size MM"/> : <SelectOrCustom value={form.sizeInch} onChange={v=>upd('sizeInch',v)} options={SIZE_INCH} placeholder="Size INCH"/>}
              <SelectOrCustom value={form.yards} onChange={v=>upd('yards',v)} options={['40','50','80','100','150','200']} placeholder="Yards"/>
              <SelectOrCustom value={form.colour} onChange={v=>upd('colour',v)} options={COLOURS} placeholder="Colour"/>
              <SelectOrCustom value={form.brand} onChange={v=>upd('brand',v)} options={BRANDS} placeholder="Brand"/>
              <SelectOrCustom value={form.micron} onChange={v=>upd('micron',v)} options={MICRONS} placeholder="Micron"/>
              <input type="number" placeholder="Rate" value={form.rate} onChange={e=>upd('rate',e.target.value)} className="bg-black/40 p-3 rounded-xl border border-white/10 outline-none"/>
              <input type="number" placeholder="Total CTN" value={form.totalCarton} onChange={e=>upd('totalCarton',e.target.value)} className="bg-black/40 p-3 rounded-xl border border-white/10 outline-none"/>
              <input type="number" placeholder="P/CTN Qty" value={form.perCtnQty} onChange={e=>upd('perCtnQty',e.target.value)} className="bg-black/40 p-3 rounded-xl border border-white/10 outline-none"/>
           </div>
           <div className="flex items-center gap-4 bg-black/20 p-4 rounded-2xl">
              <select value={form.cartonType} onChange={e=>upd('cartonType',e.target.value)} className="bg-transparent text-xs font-bold"><option value="Small">Small</option><option value="Large">Large</option></select>
              <select value={form.cartonSize} onChange={e=>upd('cartonSize',e.target.value)} className="bg-transparent text-xs font-bold">{CARTON_SIZES.map(s=><option key={s} value={s}>{s}"</option>)}</select>
              <button onClick={addItem} className="ml-auto bg-[#10b981] text-black font-black px-10 py-3 rounded-xl text-xs uppercase"><Plus size={18} className="inline mr-1"/> Add Item</button>
           </div>
        </div>
        <div className={`p-8 rounded-[2.5rem] border-2 flex flex-col items-center justify-center ${matchedStock ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/10'}`}>
            <Database size={32} className={matchedStock ? 'text-emerald-500' : 'text-red-500'}/>
            <p className="text-[10px] font-black text-gray-500 uppercase mt-2">Available Cartons</p>
            <p className="text-4xl font-black mt-2">{matchedStock?.qty || 0}</p>
        </div>
      </div>

      <div className="bg-white/[0.01] border border-white/5 rounded-[2.5rem] overflow-hidden mt-8">
        <table className="w-full text-left">
          <thead className="bg-white/5 text-[10px] font-black text-gray-500 uppercase"><tr><th className="p-6">Description</th><th className="text-center">CTN</th><th className="text-center">Rolls</th><th className="text-right">Rate</th><th className="text-right p-6">Amount</th><th className="p-6"></th></tr></thead>
          <tbody className="divide-y divide-white/5">
            {rows.map(r => (
              <tr key={r.id} className="hover:bg-white/5 transition-all">
                <td className="p-6 font-bold uppercase">{r.brand} - {r.colour} <small className="text-gray-500 italic">({r.sizeLabel})</small></td>
                <td className="text-center font-black text-[#10b981] text-2xl">{r.totalCarton}</td>
                <td className="text-center text-gray-400 font-bold">{r.totalQty} PCS</td>
                <td className="text-right text-gray-300">{Number(r.rate).toLocaleString()}</td>
                <td className="text-right font-black text-white text-2xl p-6">Rs. {r.total.toLocaleString()}</td>
                <td className="p-6 text-right"><button onClick={()=>setRows(rows.filter(x=>x.id!==r.id))} className="text-red-500/20 hover:text-red-500 transition-all"><Trash2 size={16}/></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <div className="bg-white/5 p-8 rounded-[2.5rem] flex flex-col justify-center"><p className="text-[10px] font-black text-gray-500 uppercase mb-3">Amount In Words</p><p className="text-sm font-black text-slate-400 italic">"{toWords(grandTotal)}"</p></div>
        <div className="bg-[#10b981] p-8 rounded-[3rem] flex items-center justify-between text-emerald-950 font-black">
          <p className="text-5xl">Rs. {grandTotal.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
};

export default SaleInvoice;
