import { useState, useRef, useContext } from 'react';
import { 
  Printer, Upload, Trash2, Hash, ArrowRight
} from 'lucide-react';
import { useAccounts } from '../ACCOUNTS/AccountsContext';

const SALE_PARTIES = ['AR PACKAGES','ROSHAN TRADER','HUZAIFA TRADER','SHAMS STATIONARY','ABDUL RAUF','HAMZULLAH','ANEES STATIONARY','A ONE','ZEESHAN HYD','ABDUL BASIT','MD TRADERS','MUNEER BHAI','ANWAR BHAI','FAROOQ BHAI','GR TRADER','HAMZA SIALKOT','HASHMI TRADER','GAIN TEX INTERNATIONAL','NAQI TAQI','MEMON ELECTRIC','MOK PAKistan TRADER','SABIR BROTHER 1','SABIR BROTHER 2','SHERAZ HABIB','SANAULLAH TEXTILE','SUJJAD ALI','USAMA STATIONARY','ZEESHAN HAIDRABAD','WAHEED WALI','AL FAREED','SHOKAT HAYAT','GUL AMIR','AJ ARSALAN','HAS GR TRADER','MUDASIR MEMON','UMAIR FISHERY','AMEER AKBAR','ISMAIL BHAI','BILAL BHAI','FARHAN NEW KARACHI','N.K ENTERPRISES'];

export default function SaleInvoice() {
  const { saveBill } = useAccounts();
  const [billNo, setBillNo] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [date, setDate] = useState(new Date().toLocaleDateString('en-GB'));
  const [rows, setRows] = useState([]);
  const [logo, setLogo] = useState(localStorage.getItem('erp_logo') || null);
  const [popMsg, setPopMsg] = useState('');
  const fileRef = useRef(null);
  const [form, setForm] = useState({ brand: '', size: '', rate: '', totalCarton: '', perCtnQty: '1' });

  const flash = (m) => { setPopMsg(m); setTimeout(() => setPopMsg(''), 3000); };

  const handleLogo = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => { setLogo(reader.result); localStorage.setItem('erp_logo', reader.result); };
      reader.readAsDataURL(file);
    }
  };

  const addItem = () => {
    if (!form.totalCarton || !form.rate) return;
    const totalQty = Number(form.totalCarton) * Number(form.perCtnQty);
    const amount = totalQty * Number(form.rate);
    setRows([...rows, { ...form, id: Date.now(), totalQty, amount }]);
    setForm({ brand: '', size: '', rate: '', totalCarton: '', perCtnQty: '1' });
  };

  const handleSave = async () => {
    if (!buyerName || !rows.length) return flash("Incomplete Data");
    try {
      const grandTotal = rows.reduce((s, r) => s + r.amount, 0);
      await saveBill({ billType: 'Sale', billNo, partyName: buyerName, date, items: rows, grandTotal });
      flash("Invoice Posted to Ledger");
      setRows([]); setBillNo('');
    } catch (e) { flash("Posting Failed"); }
  };

  const printA4 = () => {
    const grandTotal = rows.reduce((s, r) => s + r.amount, 0);
    const barcode = `https://bwipjs-api.metafloor.com/?bcid=code128&text=${billNo || '000'}&scale=1&rotate=N`;
    const html = `<html><head><style>@page{size:A4;margin:10mm;}body{font-family:sans-serif;padding:20px;}.header{display:flex;justify-content:space-between;border-bottom:2px solid #000;padding-bottom:20px;}.logo{height:60px;}table{width:100%;border-collapse:collapse;margin-top:30px;}th{background:#000;color:#fff;padding:10px;text-align:left;}td{padding:10px;border-bottom:1px solid #eee;}.total-box{float:right;width:250px;margin-top:20px;background:#22c55e;color:#fff;padding:15px;border-radius:10px;text-align:right;}</style></head><body><div class="header"><div>${logo?`<img src="${logo}" class="logo"/>`:''}<h1>HS PACKAGES</h1><p>KARACHI, PAKISTAN</p></div><div style="text-align:right"><h2>SALES INVOICE</h2><p>NO: #${billNo}</p><p>DATE: ${date}</p><img src="${barcode}"/></div></div><table><thead><tr><th>#</th><th>Description</th><th>Qty</th><th>Rate</th><th>Total</th></tr></thead><tbody>${rows.map((r,i)=>`<tr><td>${i+1}</td><td>${r.brand} - ${r.size}</td><td>${r.totalCarton} CTN</td><td>${r.rate}</td><td>${r.amount.toLocaleString()}</td></tr>`).join('')}</tbody></table><div class="total-box"><b>GRAND TOTAL</b><br/><span style="font-size:24px;font-weight:900">Rs. ${grandTotal.toLocaleString()}</span></div></body></html>`;
    const win = window.open('','_blank');
    win.document.write(html); win.document.close(); win.print();
  };

  return (
    <div className="min-h-screen bg-[#070707] text-white p-8">
      {popMsg && <div className="fixed top-10 right-10 bg-emerald-500 text-black px-6 py-3 rounded-full font-black z-[1000]">{popMsg}</div>}
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-12">
          <h1 className="text-5xl font-black italic">SALES <span className="text-emerald-500 text-6xl">INVOICE</span></h1>
          <div className="flex gap-4">
             <button onClick={printA4} className="bg-emerald-500 text-black px-8 py-3 rounded-xl font-black text-xs uppercase transition-all flex items-center gap-2"><Printer size={16}/> Print A4</button>
             <button onClick={handleSave} className="bg-white/5 border border-white/10 px-8 py-3 rounded-xl font-black text-xs uppercase hover:bg-white hover:text-black transition-all">Post Entry</button>
          </div>
        </div>

        <div className="bg-white/[0.03] border border-white/10 p-8 rounded-[2.5rem] grid grid-cols-1 md:grid-cols-3 gap-8 backdrop-blur-xl mb-10">
           <div className="flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-3xl p-6 cursor-pointer" onClick={()=>fileRef.current.click()}>
              {logo ? <img src={logo} className="h-20 object-contain"/> : <Upload size={24} className="text-gray-500" />}
              <input ref={fileRef} type="file" className="hidden" onChange={handleLogo} />
           </div>
           <div className="space-y-4">
              <input value={billNo} onChange={e=>setBillNo(e.target.value)} placeholder="INVOICE NO" className="w-full bg-black/40 border border-white/10 p-4 rounded-xl outline-none font-bold" />
              <select value={buyerName} onChange={e=>setBuyerName(e.target.value)} className="w-full bg-black/40 border border-white/10 p-4 rounded-xl font-bold">
                 <option value="">Select Buyer</option>
                 {SALE_PARTIES.map(p=><option key={p} value={p}>{p}</option>)}
              </select>
           </div>
           <div className="bg-emerald-500/10 rounded-3xl p-8 border border-emerald-500/20 flex flex-col justify-center">
              <span className="text-4xl font-black">Rs. {rows.reduce((s,r)=>s+r.amount, 0).toLocaleString()}</span>
           </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
           <input placeholder="Product" value={form.brand} onChange={e=>setForm({...form, brand: e.target.value})} className="bg-white/5 border border-white/10 p-3 rounded-xl" />
           <input placeholder="Size" value={form.size} onChange={e=>setForm({...form, size: e.target.value})} className="bg-white/5 border border-white/10 p-3 rounded-xl" />
           <input placeholder="CTN" type="number" value={form.totalCarton} onChange={e=>setForm({...form, totalCarton: e.target.value})} className="bg-white/5 border border-white/10 p-3 rounded-xl" />
           <input placeholder="Rate" type="number" value={form.rate} onChange={e=>setForm({...form, rate: e.target.value})} className="bg-white/5 border border-white/10 p-3 rounded-xl" />
           <button onClick={addItem} className="bg-white text-black font-black rounded-xl">ADD</button>
        </div>

        {rows.map(r => (
          <div key={r.id} className="bg-white/5 p-4 rounded-xl flex justify-between items-center mb-2 border border-white/5">
             <span className="font-bold">{r.brand} ({r.totalCarton} CTN)</span>
             <div className="flex gap-4 items-center">
               <span>Rs. {r.amount.toLocaleString()}</span>
               <button onClick={()=>setRows(rows.filter(x=>x.id!==r.id))} className="text-red-500"><Trash2 size={16}/></button>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
}
