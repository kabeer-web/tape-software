import { useState, useRef, useContext, useEffect, useMemo } from 'react';
import { 
  Plus, Trash2, Printer, Upload, X, CheckCircle2, Database, 
  AlertTriangle, ChevronDown, FileDown, ShieldCheck, MapPin, Phone, Globe, Hash
} from 'lucide-react';
import { useAccounts } from '../ACCOUNTS/AccountsContext';
import { StockContext } from '../StockContext';

const SALE_PARTIES = ['AR PACKAGES','ROSHAN TRADER','HUZAIFA TRADER','SHAMS STATIONARY','ABDUL RAUF','HAMZULLAH','ANEES STATIONARY','A ONE','ZEESHAN HYD','ABDUL BASIT','MD TRADERS','MUNEER BHAI','ANWAR BHAI','FAROOQ BHAI','GR TRADER','HAMZA SIALKOT','HASHMI TRADER','GAIN TEX INTERNATIONAL','NAQI TAQI','MEMON ELECTRIC','MOK PAKistan TRADER','SABIR BROTHER 1','SABIR BROTHER 2','SHERAZ HABIB','SANAULLAH TEXTILE','SUJJAD ALI','USAMA STATIONARY','ZEESHAN HAIDRABAD','WAHEED WALI','AL FAREED','SHOKAT HAYAT','GUL AMIR','AJ ARSALAN','HAS GR TRADER','MUDASIR MEMON','UMAIR FISHERY','AMEER AKBAR','ISMAIL BHAI','BILAL BHAI','FARHAN NEW KARACHI','N.K ENTERPRISES'];

// Helpers for Amount in Words
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

  const printA4 = () => {
    const grandTotal = rows.reduce((s, r) => s + r.amount, 0);
    const words = numToWords(grandTotal).toUpperCase() + " RUPEES ONLY";
    const barcode = `https://bwipjs-api.metafloor.com/?bcid=code128&text=${billNo || '000'}&scale=1&rotate=N`;

    const html = `
      <html>
        <head>
          <style>
            @page { size: A4; margin: 10mm; }
            body { font-family: 'Helvetica', 'Arial', sans-serif; color: #111; margin: 0; padding: 20px; }
            .invoice-container { max-width: 190mm; margin: 0 auto; }
            .header { display: flex; justify-content: space-between; border-bottom: 3px solid #1a1a1a; padding-bottom: 20px; margin-bottom: 30px; }
            .logo { height: 80px; width: auto; object-fit: contain; }
            .company-details h1 { margin: 0; font-size: 28px; font-weight: 900; color: #1a1a1a; }
            .company-details p { margin: 2px 0; font-size: 11px; color: #555; text-transform: uppercase; }
            .invoice-title-box { text-align: right; }
            .invoice-title-box h2 { margin: 0; font-size: 40px; font-weight: 900; color: #f1f5f9; letter-spacing: 3px; line-height: 1; }
            .invoice-meta { font-size: 13px; font-weight: bold; margin-top: 10px; }
            .customer-card { background: #fafafa; border: 1px solid #e5e7eb; padding: 20px; border-radius: 12px; margin-bottom: 30px; display: flex; justify-content: space-between; }
            .customer-card h3 { margin: 0 0 10px; font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1.5px; }
            .customer-info p { margin: 3px 0; font-size: 14px; font-weight: 800; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { background: #1a1a1a; color: white; text-align: left; padding: 12px 10px; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; }
            td { padding: 12px 10px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
            tr:nth-child(even) { background: #f8fafc; }
            .totals-section { display: flex; justify-content: flex-end; margin-bottom: 40px; }
            .totals-box { width: 280px; }
            .total-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
            .grand-total-box { background: #1a1a1a; color: white; padding: 20px; border-radius: 12px; margin-top: 15px; display: flex; justify-content: space-between; align-items: center; }
            .grand-total-box span { font-size: 22px; font-weight: 900; color: #22c55e; }
            .words-container { border: 2px solid #e2e8f0; padding: 15px; border-radius: 10px; font-style: italic; font-size: 12px; margin-bottom: 50px; }
            .footer-sigs { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; text-align: center; margin-top: 100px; }
            .sig-box { border-top: 1.5px solid #1a1a1a; padding-top: 8px; font-size: 10px; font-weight: 800; text-transform: uppercase; }
            .thank-you { text-align: center; margin-top: 50px; font-size: 10px; color: #94a3b8; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; }
            .barcode-img { height: 40px; margin-top: 5px; }
          </style>
        </head>
        <body>
          <div class="invoice-container">
            <div class="header">
              <div style="display:flex; align-items:center; gap:20px;">
                ${logo ? `<img src="${logo}" class="logo" />` : ''}
                <div class="company-details">
                  <h1>HS PACKAGES</h1>
                  <p>PLOT #356-5, SECTOR 5-B, SAEEDABAD</p>
                  <p>BALDIA TOWN, KARACHI</p>
                  <p>TEL: 0313-2400511, 0308-7058453</p>
                </div>
              </div>
              <div class="invoice-title-box">
                <h2>INVOICE</h2>
                <div class="invoice-meta">
                  NO: #${billNo || '---'} | DATE: ${date}
                </div>
                <img src="${barcode}" class="barcode-img" />
              </div>
            </div>

            <div class="customer-card">
              <div class="customer-info">
                <h3>BILL TO / BUYER</h3>
                <p>${buyerName}</p>
                <p style="font-weight:400; color:#666; font-size:12px;">Karachi, Sindh, Pakistan</p>
              </div>
              <div style="text-align:right">
                 <p style="font-size:11px; margin:0;"><b>STATUS:</b> <span style="color:#22c55e">UNPAID</span></p>
                 <p style="font-size:11px; margin:0; color:#999; margin-top:5px;">Page 01 of 01</p>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>#</th><th>Product Description</th><th>Qty (Ctn)</th><th>Per Ctn</th><th>Total Units</th><th>Rate</th><th>Amount</th>
                </tr>
              </thead>
              <tbody>
                ${rows.map((r, i) => `
                  <tr>
                    <td>${String(i + 1).padStart(2, '0')}</td>
                    <td style="font-weight:800">${r.brand} - ${r.size}"</td>
                    <td>${r.totalCarton}</td>
                    <td>${r.perCtnQty}</td>
                    <td><b>${r.totalQty}</b></td>
                    <td>${r.rate}</td>
                    <td style="text-align:right; font-weight:800;">${r.amount.toLocaleString()}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div class="totals-section">
               <div class="totals-box">
                  <div class="total-row"><span>Subtotal</span> <span>${grandTotal.toLocaleString()}</span></div>
                  <div class="total-row"><span>Discount</span> <span>0.00</span></div>
                  <div class="total-row"><span>Freight</span> <span>0.00</span></div>
                  <div class="grand-total-box">
                     <div style="font-size:10px; font-weight:800; opacity:0.6;">GRAND TOTAL (PKR)</div>
                     <span>${grandTotal.toLocaleString()}</span>
                  </div>
               </div>
            </div>

            <div class="words-container">
              <b>AMOUNT IN WORDS:</b><br/>
              ${words}
            </div>

            <div class="footer-sigs">
               <div class="sig-box">Prepared By</div>
               <div class="sig-box">Checked By</div>
               <div class="sig-box">Receiver Signature</div>
               <div class="sig-box">Company Stamp</div>
            </div>

            <div class="thank-you">
              Professional Cloud ERP Solution by BeerFlow
            </div>
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
    <div className="min-h-screen bg-[#070707] text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* SAP Style Header */}
        <div className="flex justify-between items-center mb-12">
          <h1 className="text-5xl font-black italic tracking-tighter">SALES <span className="text-emerald-500">INVOICE</span></h1>
          <div className="flex gap-4">
             <button onClick={printA4} className="bg-emerald-500 text-black px-10 py-4 rounded-2xl font-black text-xs hover:scale-105 transition-all shadow-xl shadow-emerald-500/20 flex items-center gap-2 uppercase tracking-widest"><Printer size={18}/> Generate Print</button>
             <button onClick={handleSave} className="bg-white/5 border border-white/10 px-10 py-4 rounded-2xl font-black text-xs hover:bg-white hover:text-black transition-all uppercase tracking-widest">Post to Ledger</button>
          </div>
        </div>

        {/* Form Grid */}
        <div className="bg-white/[0.03] border border-white/10 p-10 rounded-[3rem] grid grid-cols-1 md:grid-cols-3 gap-12 backdrop-blur-xl mb-10">
           <div className="flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-[2rem] p-6 hover:border-emerald-500/50 transition-colors cursor-pointer group" onClick={() => fileRef.current.click()}>
              {logo ? <img src={logo} className="h-24 object-contain rounded-xl"/> : <Upload className="text-gray-500 group-hover:text-emerald-500" />}
              <span className="text-[10px] font-black mt-2 text-gray-500">SET COMPANY LOGO</span>
              <input ref={fileRef} type="file" className="hidden" onChange={handleLogo} />
           </div>
           <div className="space-y-6">
              <div className="relative"><Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500" size={16}/><input value={billNo} onChange={e=>setBillNo(e.target.value)} placeholder="INVOICE NO" className="w-full bg-black/40 border border-white/10 p-4 pl-12 rounded-2xl outline-none focus:border-emerald-500 font-bold" /></div>
              <select value={buyerName} onChange={e=>setBuyerName(e.target.value)} className="w-full bg-black/40 border border-white/10 p-4 rounded-2xl outline-none font-bold text-emerald-500">
                <option value="">Select Buyer Account</option>
                {SALE_PARTIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
           </div>
           <div className="bg-emerald-500/5 rounded-[2.5rem] p-8 border border-emerald-500/20 flex flex-col justify-center">
              <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-2">Invoice Amount</span>
              <span className="text-5xl font-black tracking-tighter">Rs. {rows.reduce((s,r)=>s+r.amount, 0).toLocaleString()}</span>
           </div>
        </div>

        {/* Input Add Section */}
        <div className="bg-white/[0.02] border border-white/5 p-8 rounded-[2rem] grid grid-cols-2 md:grid-cols-5 gap-4 mb-10 items-end">
           <div className="space-y-2"><label className="text-[9px] font-black text-gray-500 ml-2">PRODUCT/BRAND</label><input value={form.brand} onChange={e=>setForm({...form, brand: e.target.value})} className="w-full bg-black border border-white/10 p-3 rounded-xl text-sm" /></div>
           <div className="space-y-2"><label className="text-[9px] font-black text-gray-500 ml-2">SIZE</label><input value={form.size} onChange={e=>setForm({...form, size: e.target.value})} className="w-full bg-black border border-white/10 p-3 rounded-xl text-sm" /></div>
           <div className="space-y-2"><label className="text-[9px] font-black text-gray-500 ml-2">CTN</label><input type="number" value={form.totalCarton} onChange={e=>setForm({...form, totalCarton: e.target.value})} className="w-full bg-black border border-white/10 p-3 rounded-xl text-sm" /></div>
           <div className="space-y-2"><label className="text-[9px] font-black text-gray-500 ml-2">RATE</label><input type="number" value={form.rate} onChange={e=>setForm({...form, rate: e.target.value})} className="w-full bg-black border border-white/10 p-3 rounded-xl text-sm" /></div>
           <button onClick={addItem} className="h-[46px] bg-white text-black font-black rounded-xl hover:bg-emerald-500 hover:scale-105 transition-all text-[10px] uppercase">Add Product</button>
        </div>

        {/* Rows List */}
        <div className="space-y-3">
          {rows.map(r => (
            <div key={r.id} className="bg-white/[0.03] p-5 rounded-2xl flex justify-between items-center border border-white/5 group hover:border-emerald-500/30 transition-all">
               <div className="flex items-center gap-6">
                 <span className="bg-emerald-500/10 text-emerald-500 w-12 h-12 flex items-center justify-center rounded-xl font-black">{r.totalCarton}</span>
                 <div><p className="font-black uppercase tracking-tight">{r.brand}</p><p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{r.size}" Standard Dimension</p></div>
               </div>
               <div className="flex items-center gap-10">
                 <div className="text-right"><p className="text-[9px] font-black text-gray-500">SUBTOTAL</p><p className="font-mono font-bold">Rs. {r.amount.toLocaleString()}</p></div>
                 <button onClick={()=>setRows(rows.filter(x=>x.id!==r.id))} className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={18}/></button>
               </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
