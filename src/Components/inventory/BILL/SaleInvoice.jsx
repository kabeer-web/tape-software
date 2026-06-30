import { useState, useRef, useContext, useEffect, useMemo } from 'react';
import { 
  Plus, Trash2, Printer, Upload, X, CheckCircle2, Database, 
  AlertTriangle, ChevronDown, FileDown, Hash, Layers, Minimize2, Maximized
} from 'lucide-react';
import { useAccounts } from '../ACCOUNTS/AccountsContext';
import { StockContext } from '../StockContext';

const SALE_PARTIES = ['AR PACKAGES','ROSHAN TRADER','HUZAIFA TRADER','SHAMS STATIONARY','ABDUL RAUF','HAMZULLAH','ANEES STATIONARY','A ONE','ZEESHAN HYD','ABDUL BASIT','MD TRADERS','MUNEER BHAI','ANWAR BHAI','FAROOQ BHAI','GR TRADER','HAMZA SIALKOT','HASHMI TRADER','GAIN TEX INTERNATIONAL','NAQI TAQI','MEMON ELECTRIC','MOK PAKISTAN TRADER','SABIR BROTHER 1','SABIR BROTHER 2','SHERAZ HABIB','SANAULLAH TEXTILE','SUJJAD ALI','USAMA STATIONARY','ZEESHAN HAIDRABAD','WAHEED WALI','AL FAREED','SHOKAT HAYAT','GUL AMIR','AJ ARSALAN','HAS GR TRADER','MUDASIR MEMON','UMAIR FISHERY','AMEER AKBAR','ISMAIL BHAI','BILAL BHAI','FARHAN NEW KARACHI','N.K ENTERPRISES'];

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

  // High Detail Form State
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
      const grandTotal = rows.reduce((s, r) => s + r.amount, 0) + Number(form.freight) - Number(form.discount);
      await saveBill({ billType: 'Sale', billNo, partyName: buyerName, date, items: rows, grandTotal });
      
      // Stock Update Logic
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
            body { font-family: 'Inter', 'Helvetica', sans-serif; color: #111; margin: 0; padding: 0; font-size: 11px; }
            .invoice-wrapper { padding: 20px; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #1a1a1a; padding-bottom: 15px; margin-bottom: 25px; }
            .logo-box { display: flex; align-items: center; gap: 15px; }
            .logo-img { height: 75px; width: auto; object-fit: contain; }
            .company-info h1 { margin: 0; font-size: 26px; font-weight: 900; letter-spacing: -1px; }
            .company-info p { margin: 1px 0; color: #555; font-size: 10px; text-transform: uppercase; }
            .invoice-title-area { text-align: right; }
            .invoice-title-area h2 { margin: 0; font-size: 38px; font-weight: 900; color: #f1f5f9; letter-spacing: 2px; }
            .meta-data { margin-top: 5px; font-weight: bold; }
            .cust-grid { display: grid; grid-template-columns: 1.5fr 1fr; gap: 30px; margin-bottom: 25px; }
            .cust-card { background: #fafafa; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; }
            .cust-card h4 { margin: 0 0 8px 0; font-size: 9px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th { background: #1a1a1a; color: white; padding: 10px 8px; text-align: left; font-size: 9px; text-transform: uppercase; }
            td { padding: 10px 8px; border-bottom: 1px solid #f1f5f9; font-size: 10px; }
            tr:nth-child(even) { background: #f8fafc; }
            .summary-flex { display: flex; justify-content: flex-end; }
            .summary-box { width: 280px; }
            .row-flex { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
            .grand-total-row { background: #22c55e; color: white; padding: 15px; border-radius: 10px; margin-top: 10px; display: flex; justify-content: space-between; align-items: center; }
            .grand-total-row span { font-size: 20px; font-weight: 900; }
            .words-area { border: 2px solid #e2e8f0; padding: 12px; border-radius: 8px; margin-top: 20px; font-style: italic; }
            .footer-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-top: 80px; text-align: center; }
            .sig-box { border-top: 1.5px solid #111; padding-top: 6px; font-size: 9px; font-weight: 800; text-transform: uppercase; }
            .barcode-box { margin-top: 10px; height: 35px; }
          </style>
        </head>
        <body>
          <div class="invoice-wrapper">
            <div class="header">
              <div class="logo-box">
                ${logo ? `<img src="${logo}" class="logo-img" />` : ''}
                <div class="company-info">
                  <h1>HS PACKAGES</h1>
                  <p>PLOT #356-5, SECTOR 5-B, SAEEDABAD, BALDIA TOWN</p>
                  <p>KARACHI, PAKISTAN | TEL: 0313-2400511</p>
                </div>
              </div>
              <div class="invoice-title-area">
                <h2>INVOICE</h2>
                <div class="meta-data">INV #${billNo || 'N/A'} | DATE: ${date}</div>
                <img src="${barcode}" class="barcode-box" />
              </div>
            </div>

            <div class="cust-grid">
              <div class="cust-card">
                <h4>Customer Details / Bill To</h4>
                <div style="font-size:15px; font-weight:900; text-transform:uppercase;">${buyerName}</div>
                <p style="margin:5px 0; color:#475569;">Karachi, Sindh, Pakistan</p>
              </div>
              <div style="text-align:right">
                <p><b>Payment Status:</b> <span style="color:#22c55e">DUE ON RECEIPT</span></p>
                <p style="color:#94a3b8; font-size:9px;">Original Copy for Buyer</p>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>#</th><th>Product Description</th><th>Size</th><th>Colour</th><th>Micron</th><th>Qty(Ctn)</th><th>Total Units</th><th>Rate</th><th>Amount</th>
                </tr>
              </thead>
              <tbody>
                ${rows.map((r, i) => `
                  <tr>
                    <td>${i+1}</td>
                    <td style="font-weight:800">${r.brand} - ${r.type}</td>
                    <td>${r.size}" x ${r.yards}yds</td>
                    <td>${r.colour}</td>
                    <td>${r.micron || '-'}</td>
                    <td>${r.totalCarton}</td>
                    <td>${r.totalQty}</td>
                    <td>${Number(r.rate).toLocaleString()}</td>
                    <td style="text-align:right; font-weight:800;">${r.amount.toLocaleString()}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div class="summary-flex">
              <div class="summary-box">
                <div class="row-flex"><span>Sub-Total</span> <span>${subtotal.toLocaleString()}</span></div>
                <div class="row-flex"><span>Discount</span> <span>- ${form.discount}</span></div>
                <div class="row-flex"><span>Freight/Loading</span> <span>+ ${form.freight}</span></div>
                <div class="grand-total-row">
                  <div style="font-size:9px; font-weight:800; opacity:0.7;">GRAND TOTAL</div>
                  <span>Rs. ${grandTotal.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div class="words-area">
              <b>Amount in words:</b><br/>
              ${toWords(grandTotal)}
            </div>

            <div class="footer-grid">
              <div class="sig-box">Prepared By</div>
              <div class="sig-box">Checked By</div>
              <div class="sig-box">Receiver Signature</div>
              <div class="sig-box">Authorized Stamp</div>
            </div>

            <p style="text-align:center; color:#cbd5e1; margin-top:50px; font-size:8px; font-weight:bold; letter-spacing:1px; text-transform:uppercase;">
              This is a computer generated invoice. No signature required for validity.
            </p>
          </div>
          <script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); }</script>
        </body>
      </html>
    `;
    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
  };

  return (
    <div className="min-h-screen bg-[#070707] text-white p-6 font-sans">
      {popMsg && <div className="fixed top-6 right-6 z-[2000] bg-emerald-500 text-black px-8 py-4 rounded-2xl font-black shadow-2xl animate-in slide-in-from-right duration-300">{popMsg}</div>}
      
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-10">
          <h1 className="text-4xl font-black italic tracking-tighter uppercase">Sales <span className="text-emerald-500 text-5xl">Engine</span></h1>
          <div className="flex gap-3">
             <button onClick={printA4} className="bg-emerald-500 text-black px-10 py-4 rounded-2xl font-black text-xs hover:scale-105 active:scale-95 transition-all flex items-center gap-2 uppercase tracking-widest shadow-lg shadow-emerald-500/20"><Printer size={18}/> Print A4 Invoice</button>
             <button onClick={handleSave} disabled={saving} className="bg-white/5 border border-white/10 px-8 py-4 rounded-2xl font-black text-xs hover:bg-white hover:text-black transition-all uppercase">{saving ? 'Processing...' : 'Post to Ledger'}</button>
          </div>
        </div>

        {/* --- HEADER CONTROLS --- */}
        <div className="bg-white/[0.03] border border-white/10 p-10 rounded-[3rem] grid grid-cols-1 md:grid-cols-3 gap-10 backdrop-blur-xl mb-8">
           <div className="flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-[2.5rem] p-6 cursor-pointer group hover:border-emerald-500/50 transition-all" onClick={()=>fileRef.current.click()}>
              {logo ? <img src={logo} className="h-20 object-contain rounded-xl"/> : <Upload size={30} className="text-gray-600 group-hover:text-emerald-500"/>}
              <span className="text-[9px] font-black mt-2 text-gray-500 uppercase tracking-widest">Company Logo</span>
              <input ref={fileRef} type="file" className="hidden" onChange={handleLogoUpload} />
           </div>
           
           <div className="space-y-5">
              <div className="relative group">
                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-emerald-500" size={16}/>
                <input value={billNo} onChange={e=>setBillNo(e.target.value)} placeholder="INVOICE NUMBER" className="w-full bg-black/40 border border-white/10 p-4 pl-12 rounded-2xl outline-none focus:border-emerald-500 font-bold transition-all" />
              </div>
              <select value={buyerName} onChange={e=>setBuyerName(e.target.value)} className="w-full bg-black/40 border border-white/10 p-4 rounded-2xl outline-none font-bold text-emerald-500 cursor-pointer">
                 <option value="">Select Buyer Account</option>
                 {SALE_PARTIES.map(p=><option key={p} value={p}>{p}</option>)}
              </select>
           </div>

           <div className="bg-emerald-500/5 rounded-[2.5rem] p-8 border border-emerald-500/20 flex flex-col justify-center text-center">
              <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-2">Grand Total Amount</span>
              <span className="text-5xl font-black tracking-tighter">Rs. {(rows.reduce((s,r)=>s+r.amount, 0) + Number(form.freight) - Number(form.discount)).toLocaleString()}</span>
           </div>
        </div>

        {/* --- PRODUCT INPUT ENGINE --- */}
        <div className="bg-white/[0.02] border border-white/5 p-8 rounded-[2.5rem] mb-8">
           <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
              <input placeholder="BRAND" value={form.brand} onChange={e=>setForm({...form, brand: e.target.value})} className="bg-black border border-white/10 p-4 rounded-xl text-xs font-bold uppercase" />
              <input placeholder="SIZE (INCH)" value={form.size} onChange={e=>setForm({...form, size: e.target.value})} className="bg-black border border-white/10 p-4 rounded-xl text-xs font-bold uppercase" />
              <input placeholder="YARDS" value={form.yards} onChange={e=>setForm({...form, yards: e.target.value})} className="bg-black border border-white/10 p-4 rounded-xl text-xs font-bold uppercase" />
              <input placeholder="COLOUR" value={form.colour} onChange={e=>setForm({...form, colour: e.target.value})} className="bg-black border border-white/10 p-4 rounded-xl text-xs font-bold uppercase" />
              <input placeholder="MICRON" value={form.micron} onChange={e=>setForm({...form, micron: e.target.value})} className="bg-black border border-white/10 p-4 rounded-xl text-xs font-bold uppercase" />
              <input placeholder="TYPE (Tape/Box)" value={form.type} onChange={e=>setForm({...form, type: e.target.value})} className="bg-black border border-white/10 p-4 rounded-xl text-xs font-bold uppercase" />
           </div>
           
           <div className="grid grid-cols-2 md:grid-cols-5 gap-4 items-end">
              <div className="space-y-1"><label className="text-[9px] font-bold text-gray-500 ml-2 uppercase">Cartons</label><input type="number" value={form.totalCarton} onChange={e=>setForm({...form, totalCarton: e.target.value})} className="bg-black border border-white/10 p-4 rounded-xl text-sm font-black w-full" /></div>
              <div className="space-y-1"><label className="text-[9px] font-bold text-gray-500 ml-2 uppercase">Per Ctn Qty</label><input type="number" value={form.perCtnQty} onChange={e=>setForm({...form, perCtnQty: e.target.value})} className="bg-black border border-white/10 p-4 rounded-xl text-sm font-black w-full" /></div>
              <div className="space-y-1"><label className="text-[9px] font-bold text-gray-500 ml-2 uppercase">Unit Rate</label><input type="number" value={form.rate} onChange={e=>setForm({...form, rate: e.target.value})} className="bg-black border border-white/10 p-4 rounded-xl text-sm font-black w-full text-emerald-500" /></div>
              <div className="space-y-1"><label className="text-[9px] font-bold text-gray-500 ml-2 uppercase">Freight</label><input type="number" value={form.freight} onChange={e=>setForm({...form, freight: e.target.value})} className="bg-black border border-white/10 p-4 rounded-xl text-sm font-black w-full" /></div>
              <button onClick={addItem} className="bg-white text-black h-[54px] rounded-xl font-black text-xs uppercase hover:bg-emerald-500 transition-all flex items-center justify-center gap-2 shadow-xl shadow-white/5"><Plus size={16}/> Add Product</button>
           </div>
        </div>

        {/* --- PREVIEW TABLE --- */}
        <div className="bg-[#111] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
           <table className="w-full text-left">
              <thead>
                <tr className="bg-white/5">
                  <th className="p-6 text-[10px] font-black text-gray-500">DESCRIPTION</th>
                  <th className="p-6 text-[10px] font-black text-gray-500 text-center">CTN / UNIT</th>
                  <th className="p-6 text-[10px] font-black text-gray-500 text-center">RATE</th>
                  <th className="p-6 text-[10px] font-black text-gray-500 text-right">TOTAL</th>
                  <th className="p-6 w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rows.length === 0 ? (
                  <tr><td colSpan={5} className="p-20 text-center opacity-10 font-black text-2xl uppercase tracking-tighter italic">No Items Added Yet</td></tr>
                ) : rows.map(r => (
                  <tr key={r.id} className="group hover:bg-white/[0.02] transition-colors">
                    <td className="p-6">
                       <p className="font-black text-white uppercase">{r.brand} - {r.colour}</p>
                       <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">{r.size}" x {r.yards}yds | {r.micron} Micron | {r.type}</p>
                    </td>
                    <td className="p-6 text-center">
                       <span className="bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-lg font-black text-xs">{r.totalCarton} CTN</span>
                       <p className="text-[9px] text-gray-600 mt-1 font-bold italic">{r.totalQty} Units Total</p>
                    </td>
                    <td className="p-6 text-center font-mono font-bold text-gray-400">Rs. {Number(r.rate).toLocaleString()}</td>
                    <td className="p-6 text-right font-black text-white text-lg tracking-tighter">Rs. {r.amount.toLocaleString()}</td>
                    <td className="p-6">
                       <button onClick={()=>setRows(rows.filter(x=>x.id!==r.id))} className="text-red-500 opacity-0 group-hover:opacity-100 transition-all p-2 hover:bg-red-500/10 rounded-lg"><Trash2 size={16}/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
           </table>
        </div>
      </div>
    </div>
  );
}
