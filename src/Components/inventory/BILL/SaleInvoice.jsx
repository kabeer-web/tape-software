import { useState, useRef, useContext } from 'react';
import {
  FileText, Plus, Trash2, Printer,
  Upload, X, Save, AlertCircle, CheckCircle2, Box
} from 'lucide-react';
import { useAccounts } from '../../ACCOUNTS/AccountsContext';
import { StockContext } from '../../StockContext';

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

// ── HTML Print Generator ─────────────────────────────────
export const generateInvoiceHTML = (bill) => {
    const { billNo, partyName, date, items, grandTotal, totalCartonCount, logo } = bill;
    const logoHtml = logo ? `<img src="${logo}" style="height:60px;object-fit:contain;"/>` : `<div style="font-size:24px;font-weight:900;">HS Packages</div>`;
    const rowsHtml = (items || []).map((r, i) => {
      const size = r.sizeLabel || [r.sizeMm ? `${r.sizeMm}mm` : '', r.sizeInch ? `${r.sizeInch}` : '', r.yards ? `${r.yards}yds` : ''].filter(Boolean).join(' / ');
      return `<tr><td style="text-align:center">${i + 1}</td><td style="font-weight:600">${size}</td><td>${r.colour || '—'}</td><td>${r.brand || '—'}</td><td style="text-align:center">${r.micron || '—'}</td><td style="text-align:center">${r.totalCarton}</td><td style="text-align:center">${r.perCtnQty}</td><td style="text-align:center;font-weight:700">${r.totalQty}</td><td style="text-align:right">${(r.rate || 0).toLocaleString()}</td><td style="text-align:right;font-weight:700">${(r.total || 0).toLocaleString()}</td></tr>`;
    }).join('');
    return `<!DOCTYPE html><html><head><title>Invoice #${billNo}</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:sans-serif;font-size:11px;padding:30px}.hdr{display:flex;justify-content:space-between;border-bottom:2px solid #000;padding-bottom:10px;margin-bottom:20px}.meta-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:20px}.meta-item{border:1px solid #ddd;padding:8px}table{width:100%;border-collapse:collapse;margin-bottom:20px}th{background:#f0f0f0;border:1px solid #000;padding:5px}td{border:1px solid #ddd;padding:5px}.footer{display:flex;justify-content:space-between}.total-box{border:2px solid #000;padding:10px;width:200px;text-align:center}.sigs{display:flex;justify-content:space-between;margin-top:50px}.sig-line{border-top:1px solid #000;width:150px;text-align:center}</style></head><body><div class="hdr"><div>${logoHtml}<br/>${ADDR}</div><h1>INVOICE</h1></div><div class="meta-grid"><div class="meta-item">Customer: ${partyName}</div><div class="meta-item">Invoice: #${billNo}</div><div class="meta-item">Date: ${date}</div></div><table><thead><tr><th>#</th><th>Description</th><th>Color</th><th>Brand</th><th>Mic</th><th>CTN</th><th>P.Qty</th><th>Total</th><th>Rate</th><th>Amount</th></tr></thead><tbody>${rowsHtml}</tbody></table><div class="footer"><div>Words: ${toWords(grandTotal)}<br/>Total CTN: ${totalCartonCount}</div><div class="total-box">GRAND TOTAL<br/><h2>Rs. ${grandTotal.toLocaleString()}</h2></div></div><div class="sigs"><div class="sig-line">Prepared By</div><div class="sig-line">Receiver</div><div class="sig-line">Authorized</div></div><script>window.onload=()=>{window.print();window.onafterprint=()=>window.close()}</script></body></html>`;
};

const SaleInvoice = () => {
  const { saveBill }                  = useAccounts();
  const { inventory, updateStock }    = useContext(StockContext);

  const [billNo,     setBillNo]     = useState('');
  const [buyerName,  setBuyerName]  = useState('');
  const [date,       setDate]       = useState(new Date().toLocaleDateString('en-GB'));
  const [form,       setForm]       = useState(emptyItem);
  const [rows,       setRows]       = useState([]);
  const [carton,     setCarton]     = useState(emptyCarton);
  const [logo,       setLogo]       = useState(null);
  const [msg,        setMsg]        = useState('');
  const [saving,     setSaving]     = useState(false);
  const fileRef = useRef(null);

  const upd  = (k, v) => setForm(p => ({...p, [k]: v}));
  const updC = (k, v) => setCarton(p => ({...p, [k]: v}));

  const addItem = () => {
    const tc = parseFloat(form.totalCarton) || 0;
    const pc = parseFloat(form.perCtnQty)   || 0;
    const r  = parseFloat(form.rate)        || 0;
    if (!tc || !r) return alert("Qty aur Rate bharein");
    const totalQty = tc * pc;
    const total    = totalQty * r;
    const sizeLabel = [form.sizeMm ? `${form.sizeMm}mm` : '', form.sizeInch ? `${form.sizeInch}` : '', form.yards ? `${form.yards}yds` : ''].filter(Boolean).join(' / ');
    setRows(p => [...p, { id: Date.now(), ...form, sizeLabel, totalCarton: tc, perCtnQty: pc, rate: r, totalQty, total }]);
    setForm(emptyItem);
  };

  const removeRow = (id) => setRows(p => p.filter(r => r.id !== id));

  const handleSave = async () => {
    if (!billNo || !buyerName) return alert("Header details missing");
    setSaving(true);
    try {
      if (carton.brand && carton.qty) {
        const cartonInv = inventory.find(i => i.brand === carton.brand && i.category === 'Carton' && (i.carton_type === carton.type || i.cartonType === carton.type) && String(i.size) === String(carton.size));
        if (cartonInv) await updateStock(cartonInv._id || cartonInv.id, -parseInt(carton.qty));
      }
      await saveBill({ billType: 'Sale', billNo, partyName: buyerName, date, items: rows, grandTotal, totalCartonCount, logo });
      setMsg(`✅ Save Success!`);
      setRows([]); setBillNo(''); setBuyerName('');
    } catch (err) { setMsg('❌ Error: ' + err.message); } finally { setSaving(false); }
  };

  const grandTotal = rows.reduce((s, r) => s + r.total, 0);
  const totalCartonCount = rows.reduce((s, r) => s + (r.totalCarton || 0), 0);

  return (
    <div className="text-white min-h-screen p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-black">SALE <span className="text-[#22c55e]">INVOICE</span></h1>
        <div className="flex gap-2">
           <button onClick={handleSave} disabled={saving} className="bg-[#22c55e] text-black px-6 py-2 rounded-xl font-bold">{saving ? 'Saving...' : 'Save'}</button>
           <button onClick={() => {
             const html = generateInvoiceHTML({ billNo, partyName: buyerName, date, items: rows, grandTotal, totalCartonCount, logo });
             const w = window.open('', '_blank'); w.document.write(html); w.document.close();
           }} className="bg-white/10 px-6 py-2 rounded-xl font-bold">Print</button>
        </div>
      </div>

      {msg && <div className="p-4 bg-[#22c55e]/10 border border-[#22c55e] text-[#22c55e] rounded-xl mb-4 font-bold">{msg}</div>}

      <div className="bg-white/5 p-6 rounded-3xl border border-white/10 mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <input value={billNo} onChange={e=>setBillNo(e.target.value)} placeholder="Invoice #" className="bg-black/40 p-4 rounded-xl border border-white/10 outline-none focus:border-[#22c55e]"/>
          
          <div className="relative">
            <input list="parties-list" value={buyerName} onChange={e=>setBuyerName(e.target.value.toUpperCase())} placeholder="Buyer Name" className="w-full bg-black/40 p-4 rounded-xl border border-white/10 outline-none focus:border-[#22c55e]"/>
            <datalist id="parties-list">
                {PARTIES.map((p,i) => <option key={i} value={p}/>)}
            </datalist>
          </div>

          <input value={date} onChange={e=>setDate(e.target.value)} className="bg-black/40 p-4 rounded-xl border border-white/10 outline-none"/>
      </div>

      {/* Item Form Section */}
      <div className="bg-white/5 p-6 rounded-3xl border border-white/10 mb-6 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 items-end">
          <SelectOrCustom options={SIZE_MM} value={form.sizeMm} onChange={v=>upd('sizeMm',v)} placeholder="Mm"/>
          <SelectOrCustom options={YARDS_LIST} value={form.yards} onChange={v=>upd('yards',v)} placeholder="Yds"/>
          <SelectOrCustom options={COLOURS} value={form.colour} onChange={v=>upd('colour',v)} placeholder="Color"/>
          <SelectOrCustom options={BRANDS} value={form.brand} onChange={v=>upd('brand',v)} placeholder="Brand"/>
          <input type="number" placeholder="CTN" value={form.totalCarton} onChange={e=>upd('totalCarton',e.target.value)} className="bg-black/40 p-3 rounded-xl border border-white/10 outline-none"/>
          <input type="number" placeholder="Rolls" value={form.perCtnQty} onChange={e=>upd('perCtnQty',e.target.value)} className="bg-black/40 p-3 rounded-xl border border-white/10 outline-none"/>
          <input type="number" placeholder="Rate" value={form.rate} onChange={e=>upd('rate',e.target.value)} className="bg-black/40 p-3 rounded-xl border border-white/10 outline-none"/>
          <button onClick={addItem} className="bg-[#22c55e] text-black font-bold h-[48px] rounded-xl flex items-center justify-center"><Plus size={20}/></button>
      </div>

      <div className="bg-white/5 rounded-3xl border border-white/10 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-white/5 text-gray-400 text-xs uppercase">
            <tr><th className="p-4">Description</th><th className="p-4">CTN</th><th className="p-4">Total Qty</th><th className="p-4">Rate</th><th className="p-4">Amount</th><th className="p-4"></th></tr>
          </thead>
          <tbody>
            {rows.map(r=>(
              <tr key={r.id} className="border-t border-white/5">
                <td className="p-4 font-bold">{r.brand} - {r.sizeLabel}</td>
                <td className="p-4">{r.totalCarton}</td>
                <td className="p-4">{r.totalQty}</td>
                <td className="p-4">{r.rate}</td>
                <td className="p-4 font-black text-[#22c55e]">Rs. {r.total.toLocaleString()}</td>
                <td className="p-4"><button onClick={()=>removeRow(r.id)}><Trash2 size={16} className="text-red-500"/></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="mt-6 flex justify-end">
        <div className="bg-[#22c55e] p-6 rounded-3xl text-black text-right min-w-[300px] shadow-xl">
          <p className="font-bold opacity-60 uppercase text-[10px] tracking-widest">Grand Total</p>
          <h2 className="text-4xl font-black tracking-tighter">Rs. {grandTotal.toLocaleString()}</h2>
          <p className="text-[10px] font-bold italic mt-2 opacity-80">{toWords(grandTotal)}</p>
        </div>
      </div>
    </div>
  );
};

export default SaleInvoice;
