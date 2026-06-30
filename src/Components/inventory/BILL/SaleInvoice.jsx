import { useState, useRef, useContext, useEffect, useMemo } from 'react';
import { 
  Plus, Trash2, Printer, Upload, X, CheckCircle2, Database, 
  AlertTriangle, ChevronDown, FileDown, Hash, Layers, Minimize2, Maximize2 
} from 'lucide-react';
import { useAccounts } from '../ACCOUNTS/AccountsContext';
import { StockContext } from '../StockContext';

const SALE_PARTIES = ['AR PACKAGES','ROSHAN TRADER','HUZAIFA TRADER','SHAMS STATIONARY','ABDUL RAUF','HAMZULLAH','ANEES STATIONARY','A ONE','ZEESHAN HYD','ABDUL BASIT','MD TRADERS','MUNEER BHAI','ANWAR BHAI','FAROOQ BHAI','GR TRADER','HAMZA SIALKOT','HASHMI TRADER','GAIN TEX INTERNATIONAL','NAQI TAQI','MEMON ELECTRIC','MOK PAKISTAN TRADER','SABIR BROTHER 1','SABIR BROTHER 2','SHERAZ HABIB','SANAULLAH TEXTILE','SUJJAD ALI','USAMA STATIONARY','ZEESHAN HAIDRABAD','WAHEED WALI','AL FAREED','SHOKAT HAYAT','GUL AMIR','AJ ARSALAN','HAS GR TRADER','MUDASIR MEMON','UMAIR FISHERY','AMEER AKBAR','ISMAIL BHAI','BILAL BHAI','FARHAN NEW KARACHI','N.K ENTERPRISES'];

// --- NUMBERS TO WORDS LOGIC ---
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

export default function SaleInvoice() {
  const { saveBill } = useAccounts();
  const { inventory, updateStock } = useContext(StockContext);

  const [billNo, setBillNo] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [date, setDate] = useState(new Date().toLocaleDateString('en-GB'));
  const [rows, setRows] = useState([]);
  const [logo, setLogo] = useState(localStorage.getItem('erp_logo') || null);
  const [popMsg, setPopMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  const [form, setForm] = useState({ 
    brand: '', size: '', yards: '', colour: '', type: 'Tape', micron: '', 
    totalCarton: '', perCtnQty: '', rate: '', discount: 0, freight: 0 
  });

  const flash = (m) => { setPopMsg(m); setTimeout(() => setPopMsg(''), 3000); };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => { setLogo(reader.result); localStorage.setItem('erp_logo', reader.result); };
      reader.readAsDataURL(file);
    }
  };

  const addItem = () => {
    if (!form.brand || !form.totalCarton || !form.rate) return flash("Fill Product, Qty & Rate");
    const totalQty = Number(form.totalCarton) * Number(form.perCtnQty || 1);
    const amount = totalQty * Number(form.rate);
    setRows([...rows, { ...form, id: Date.now(), totalQty, amount }]);
    setForm({ ...form, totalCarton: '', perCtnQty: '', rate: '' });
  };

  const handleSave = async () => {
    if (!buyerName || !rows.length || !billNo) return flash("Fill Buyer, Bill # and Items");
    setSaving(true);
    try {
      const subtotal = rows.reduce((s, r) => s + r.amount, 0);
      const grandTotal = subtotal + Number(form.freight) - Number(form.discount);
      
      await saveBill({ billType: 'Sale', billNo, partyName: buyerName, date, items: rows, grandTotal });
      
      for (const row of rows) {
        const itemInInv = inventory.find(i => i.brand === row.brand && i.category === 'Carton');
        if (itemInInv) await updateStock(itemInInv._id, -Number(row.totalCarton));
      }

      flash("✅ Invoice Posted to Ledger Successfully!");
      setRows([]); setBillNo(''); setBuyerName('');
    } catch (e) { flash("❌ Error saving invoice"); }
    finally { setSaving(false); }
  };

  const printA4 = () => {
    const subtotal = rows.reduce((s, r) => s + r.amount, 0);
    const grandTotal = subtotal + Number(form.freight) - Number(form.discount);
    const barcode = `https://bwipjs-api.metafloor.com/?bcid=code128&text=${billNo || '000'}&scale=1&rotate=N&includetext`;

    const html = `
      <html>
        <head>
          <style>
            @page { size: A4; margin: 12mm; }
            body { font-family: sans-serif; color: #111; margin: 0; padding: 20px; font-size: 11px; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #1a1a1a; padding-bottom: 15px; margin-bottom: 25px; }
            .logo-img { height: 70px; width: auto; object-fit: contain; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th { background: #1a1a1a; color: white; padding: 10px; text-align: left; }
            td { padding: 10px; border-bottom: 1px solid #f1f5f9; }
            .total-box { background: #22c55e; color: white; padding: 15px; border-radius: 10px; float: right; width: 250px; text-align: right; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>${logo ? `<img src="${logo}" class="logo-img" />` : ''}<h1>HS PACKAGES</h1></div>
            <div style="text-align:right"><h2>SALES INVOICE</h2><p>INV #${billNo} | DATE: ${date}</p><img src="${barcode}" /></div>
          </div>
          <p><b>Bill To:</b> ${buyerName}</p>
          <table>
            <thead><tr><th>#</th><th>Description</th><th>Qty(Ctn)</th><th>Rate</th><th>Amount</th></tr></thead>
            <tbody>${rows.map((r, i) => `<tr><td>${i+1}</td><td>${r.brand} - ${r.size}"</td><td>${r.totalCarton}</td><td>${r.rate}</td><td>${r.amount.toLocaleString()}</td></tr>`).join('')}</tbody>
          </table>
          <div class="total-box"><b>GRAND TOTAL:</b><br/><span style="font-size:20px">Rs. ${grandTotal.toLocaleString()}</span></div>
          <script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); }</script>
        </body>
      </html>`;
    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
  };

  return (
    <div className="min-h-screen bg-[#070707] text-white p-6">
      {popMsg && <div className="fixed top-6 right-6 z-[2000] bg-emerald-500 text-black px-8 py-4 rounded-2xl font-black">{popMsg}</div>}
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-10">
          <h1 className="text-4xl font-black italic">Sales <span className="text-emerald-500 text-5xl">Engine</span></h1>
          <div className="flex gap-3">
             <button onClick={printA4} className="bg-emerald-500 text-black px-10 py-4 rounded-2xl font-black text-xs uppercase"><Printer size={18}/> Print A4</button>
             <button onClick={handleSave} disabled={saving} className="bg-white/5 border border-white/10 px-8 py-4 rounded-2xl font-black text-xs uppercase">Post to Ledger</button>
          </div>
        </div>

        <div className="bg-white/[0.03] border border-white/10 p-10 rounded-[3rem] grid grid-cols-1 md:grid-cols-3 gap-10 backdrop-blur-xl mb-8">
           <div className="flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-[2.5rem] p-6 cursor-pointer" onClick={()=>fileRef.current.click()}>
              {logo ? <img src={logo} className="h-20 object-contain"/> : <Upload size={30} className="text-gray-600"/>}
              <input ref={fileRef} type="file" className="hidden" onChange={handleLogoUpload} />
           </div>
           <div className="space-y-5">
              <input value={billNo} onChange={e=>setBillNo(e.target.value)} placeholder="INVOICE NUMBER" className="w-full bg-black/40 border border-white/10 p-4 rounded-2xl outline-none font-bold" />
              <select value={buyerName} onChange={e=>setBuyerName(e.target.value)} className="w-full bg-black/40 border border-white/10 p-4 rounded-2xl outline-none font-bold text-emerald-500">
                 <option value="">Select Buyer Account</option>
                 {SALE_PARTIES.map(p=><option key={p} value={p}>{p}</option>)}
              </select>
           </div>
           <div className="bg-emerald-500/5 rounded-[2.5rem] p-8 border border-emerald-500/20 text-center">
              <span className="text-[10px] font-black text-emerald-500 uppercase">Total Amount</span>
              <p className="text-5xl font-black">Rs. {(rows.reduce((s,r)=>s+r.amount, 0) + Number(form.freight) - Number(form.discount)).toLocaleString()}</p>
           </div>
        </div>

        <div className="bg-white/[0.02] border border-white/5 p-8 rounded-[2.5rem] grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
           <input placeholder="BRAND" value={form.brand} onChange={e=>setForm({...form, brand: e.target.value})} className="bg-black border border-white/10 p-4 rounded-xl" />
           <input placeholder="SIZE" value={form.size} onChange={e=>setForm({...form, size: e.target.value})} className="bg-black border border-white/10 p-4 rounded-xl" />
           <input type="number" placeholder="Cartons" value={form.totalCarton} onChange={e=>setForm({...form, totalCarton: e.target.value})} className="bg-black border border-white/10 p-4 rounded-xl" />
           <input type="number" placeholder="Rate" value={form.rate} onChange={e=>setForm({...form, rate: e.target.value})} className="bg-black border border-white/10 p-4 rounded-xl" />
           <button onClick={addItem} className="bg-white text-black rounded-xl font-black">Add Product</button>
        </div>

        <div className="bg-[#111] rounded-[2.5rem] border border-white/5 overflow-hidden">
           <table className="w-full text-left">
              <thead><tr className="bg-white/5"><th className="p-6">DESCRIPTION</th><th className="p-6 text-right">TOTAL</th><th className="p-6"></th></tr></thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} className="group border-t border-white/5">
                    <td className="p-6 font-bold">{r.brand} - {r.size}" ({r.totalCarton} CTN)</td>
                    <td className="p-6 text-right font-black">Rs. {r.amount.toLocaleString()}</td>
                    <td className="p-6 text-right"><button onClick={()=>setRows(rows.filter(x=>x.id!==r.id))} className="text-red-500"><Trash2 size={16}/></button></td>
                  </tr>
                ))}
              </tbody>
           </table>
        </div>
      </div>
    </div>
  );
}
