import { useState, useRef, useContext, useEffect, useMemo } from 'react';
import { 
  Plus, Trash2, Printer, Upload, X, CheckCircle2, Database, 
  AlertTriangle, ChevronDown, FileDown, ShieldCheck, MapPin, Phone, Globe 
} from 'lucide-react';
import { useAccounts } from '../ACCOUNTS/AccountsContext';
import { StockContext } from '../StockContext';

const SALE_PARTIES = ['AR PACKAGES','ROSHAN TRADER','HUZAIFA TRADER','SHAMS STATIONARY','ABDUL RAUF','HAMZULLAH','ANEES STATIONARY','A ONE','ZEESHAN HYD','ABDUL BASIT','MD TRADERS','MUNEER BHAI','ANWAR BHAI','FAROOQ BHAI','GR TRADER','HAMZA SIALKOT','HASHMI TRADER','GAIN TEX INTERNATIONAL','NAQI TAQI','MEMON ELECTRIC','MOK PAKISTAN TRADER','SABIR BROTHER 1','SABIR BROTHER 2','SHERAZ HABIB','SANAULLAH TEXTILE','SUJJAD ALI','USAMA STATIONARY','ZEESHAN HAIDRABAD','WAHEED WALI','AL FAREED','SHOKAT HAYAT','GUL AMIR','AJ ARSALAN','HAS GR TRADER','MUDASIR MEMON','UMAIR FISHERY','AMEER AKBAR','ISMAIL BHAI','BILAL BHAI','FARHAN NEW KARACHI','N.K ENTERPRISES'];

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
  const { inventory, updateStock, refreshInventory } = useContext(StockContext);

  const [billNo, setBillNo] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [date, setDate] = useState(new Date().toLocaleDateString('en-GB'));
  const [rows, setRows] = useState([]);
  const [logo, setLogo] = useState(localStorage.getItem('erp_logo') || null);
  const [popMsg, setPopMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  const [form, setForm] = useState({ 
    brand: '', colour: '', size: '', yards: '', micron: '', 
    totalCarton: '', perCtnQty: '', rate: '', type: 'Small' 
  });

  const handleLogo = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { setLogo(reader.result); localStorage.setItem('erp_logo', reader.result); };
    reader.readAsDataURL(file);
  };

  const addItem = () => {
    if (!form.totalCarton || !form.rate) return;
    const qty = Number(form.totalCarton) * Number(form.perCtnQty || 1);
    const total = qty * Number(form.rate);
    setRows([...rows, { ...form, id: Date.now(), totalQty: qty, amount: total }]);
    setForm({ ...form, totalCarton: '', perCtnQty: '', rate: '' });
  };

  const handleSave = async () => {
    if (!buyerName || !rows.length) return;
    setSaving(true);
    try {
      const grandTotal = rows.reduce((s, r) => s + r.amount, 0);
      await saveBill({ billType: 'Sale', billNo, partyName: buyerName, date, items: rows, grandTotal });
      flash("Invoice Saved Successfully!");
      setRows([]); setBillNo('');
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const flash = (m) => { setPopMsg(m); setTimeout(() => setPopMsg(''), 3000); };

  const printInvoice = () => {
    const grandTotal = rows.reduce((s, r) => s + r.amount, 0);
    const barcodeUrl = `https://bwipjs-api.metafloor.com/?bcid=code128&text=${billNo || '000'}&scale=2&rotate=N&includetext`;

    const html = `
      <html>
        <head>
          <title>Invoice_${billNo}</title>
          <style>
            @page { size: A4; margin: 15mm; }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1a1a1a; line-height: 1.4; }
            .header { display: flex; justify-content: space-between; margin-bottom: 30px; border-bottom: 2px solid #f0f0f0; padding-bottom: 20px; }
            .company-info h1 { margin: 0; color: #000; font-size: 28px; font-weight: 800; letter-spacing: -1px; }
            .company-info p { margin: 2px 0; font-size: 11px; color: #666; font-weight: 500; text-transform: uppercase; }
            .invoice-meta { text-align: right; }
            .invoice-meta h2 { margin: 0; font-size: 35px; font-weight: 900; color: #e2e8f0; letter-spacing: 2px; }
            .meta-grid { display: grid; grid-template-columns: auto auto; gap: 5px 15px; margin-top: 10px; font-size: 12px; }
            .meta-label { font-weight: 700; color: #666; text-transform: uppercase; }
            .customer-section { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 30px; }
            .customer-box { background: #fafafa; padding: 15px; border-radius: 8px; border: 1px solid #eee; }
            .customer-box h3 { margin: 0 0 8px 0; font-size: 10px; color: #999; text-transform: uppercase; letter-spacing: 1px; }
            .customer-name { font-size: 16px; font-weight: 800; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px; }
            th { background: #1a1a1a; color: #fff; padding: 10px; text-align: left; text-transform: uppercase; letter-spacing: 1px; }
            td { padding: 10px; border-bottom: 1px solid #f0f0f0; }
            tr:nth-child(even) { background: #fcfcfc; }
            .totals-container { display: flex; justify-content: flex-end; margin-top: 20px; }
            .total-box { width: 250px; }
            .total-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
            .grand-total { background: #22c55e; color: #fff; padding: 15px; border-radius: 12px; margin-top: 10px; display: flex; justify-content: space-between; align-items: center; }
            .grand-total span { font-size: 18px; font-weight: 900; }
            .words-box { border: 1px dashed #ddd; padding: 15px; border-radius: 8px; margin-top: 20px; font-style: italic; font-size: 12px; color: #444; }
            .footer { margin-top: 60px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; text-align: center; }
            .sig-line { border-top: 1px solid #000; padding-top: 10px; font-size: 10px; font-weight: 700; text-transform: uppercase; }
            .barcode { margin-top: 10px; height: 40px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div style="display:flex; align-items:center; gap:20px;">
              ${logo ? `<img src="${logo}" style="height:70px; width:auto; object-fit:contain;"/>` : ''}
              <div class="company-info">
                <h1>HS PACKAGES</h1>
                <p>PLOT #356-5, SECTOR 5-B, SAEEDABAD</p>
                <p>BALDIA TOWN, KARACHI</p>
                <p>Phone: 0313-2400511, 0308-7058453</p>
              </div>
            </div>
            <div class="invoice-meta">
              <h2>SALES INVOICE</h2>
              <div class="meta-grid">
                <span class="meta-label">Invoice No:</span> <span style="font-weight:800">#${billNo}</span>
                <span class="meta-label">Date:</span> <span>${date}</span>
                <span class="meta-label">Status:</span> <span style="color:#22c55e; font-weight:700">UNPAID</span>
              </div>
              <img src="${barcodeUrl}" class="barcode" />
            </div>
          </div>

          <div class="customer-section">
            <div class="customer-box">
              <h3>Bill To / Buyer</h3>
              <div class="customer-name">${buyerName}</div>
              <p style="margin:5px 0; font-size:11px; color:#555">Karachi, Pakistan</p>
            </div>
            <div style="text-align:right">
               <p style="font-size:10px; color:#999; margin:0">Page 1 of 1</p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>#</th><th>Description</th><th>Brand</th><th>Size</th><th>Colour</th><th>Cartons</th><th>Rate</th><th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map((r, i) => `
                <tr>
                  <td>${i+1}</td>
                  <td style="font-weight:700">${r.type} ${r.micron || ''}</td>
                  <td>${r.brand}</td>
                  <td>${r.size}" / ${r.yards}yds</td>
                  <td>${r.colour}</td>
                  <td>${r.totalCarton} CTN</td>
                  <td>${r.rate.toLocaleString()}</td>
                  <td style="font-weight:800">${r.amount.toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="totals-container">
            <div class="total-box">
              <div class="total-row"><span class="meta-label">Subtotal</span> <span>Rs. ${grandTotal.toLocaleString()}</span></div>
              <div class="total-row"><span class="meta-label">Tax (0%)</span> <span>0.00</span></div>
              <div class="grand-total">
                <div style="font-size:10px; font-weight:700; text-transform:uppercase;">Grand Total</div>
                <span>Rs. ${grandTotal.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div class="words-box">
            <strong>Amount in words:</strong><br/>
            ${toWords(grandTotal)}
          </div>

          <div class="footer">
            <div class="sig-line">Prepared By</div>
            <div class="sig-line">Receiver Signature</div>
            <div class="sig-line">Authorized Stamp</div>
          </div>

          <div style="margin-top:40px; text-align:center; font-size:10px; color:#aaa; font-weight:700; text-transform:uppercase; letter-spacing:2px;">
            Thank you for your business
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
    <div className="text-white min-h-screen p-8 bg-[#070707]">
      {popMsg && <div className="fixed top-10 right-10 z-[200] bg-emerald-500 text-black p-4 rounded-2xl font-black shadow-2xl animate-bounce">{popMsg}</div>}
      
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-12">
          <h1 className="text-5xl font-black italic tracking-tighter">PREMIUM <span className="text-emerald-500">BILLING</span></h1>
          <div className="flex gap-4">
            <button onClick={handleSave} disabled={saving} className="bg-white/5 border border-white/10 px-8 py-3 rounded-2xl font-black text-xs hover:bg-emerald-500 hover:text-black transition-all">SAVE INVOICE</button>
            <button onClick={printInvoice} className="bg-emerald-500 text-black px-8 py-3 rounded-2xl font-black text-xs flex items-center gap-2 hover:scale-105 transition-all"><Printer size={16}/> PRINT A4</button>
          </div>
        </div>

        <div className="bg-white/[0.03] border border-white/10 p-8 rounded-[2.5rem] grid grid-cols-1 md:grid-cols-3 gap-8 backdrop-blur-xl mb-8">
           <div className="flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-3xl p-4 group cursor-pointer" onClick={() => fileRef.current.click()}>
              {logo ? <img src={logo} className="h-20 object-contain"/> : <Upload className="text-gray-500 group-hover:text-emerald-500 transition-colors" />}
              <span className="text-[10px] font-black mt-2 text-gray-500">UPLOAD LOGO</span>
              <input ref={fileRef} type="file" className="hidden" onChange={handleLogo} />
           </div>
           <div className="space-y-4">
              <div><label className="text-[10px] font-black text-gray-500 block mb-1">INVOICE #</label><input value={billNo} onChange={e=>setBillNo(e.target.value)} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl outline-none focus:border-emerald-500" /></div>
              <div><label className="text-[10px] font-black text-gray-500 block mb-1">BUYER NAME</label>
                <select value={buyerName} onChange={e=>setBuyerName(e.target.value)} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl outline-none">
                  <option value="">Select Party</option>
                  {SALE_PARTIES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
           </div>
           <div className="flex flex-col justify-center bg-emerald-500/10 rounded-[2rem] p-6 border border-emerald-500/20">
              <span className="text-[10px] font-black text-emerald-500 mb-1">TOTAL AMOUNT</span>
              <span className="text-4xl font-black tracking-tighter">Rs. {rows.reduce((s,r)=>s+r.amount, 0).toLocaleString()}</span>
           </div>
        </div>

        {/* Add Item Row */}
        <div className="bg-white/[0.02] border border-white/5 p-6 rounded-3xl grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
           <input placeholder="Brand" value={form.brand} onChange={e=>setForm({...form, brand: e.target.value})} className="bg-black/20 border border-white/10 p-3 rounded-xl text-sm" />
           <input placeholder="Size" value={form.size} onChange={e=>setForm({...form, size: e.target.value})} className="bg-black/20 border border-white/10 p-3 rounded-xl text-sm" />
           <input placeholder="Rate" type="number" value={form.rate} onChange={e=>setForm({...form, rate: e.target.value})} className="bg-black/20 border border-white/10 p-3 rounded-xl text-sm" />
           <input placeholder="Cartons" type="number" value={form.totalCarton} onChange={e=>setForm({...form, totalCarton: e.target.value})} className="bg-black/20 border border-white/10 p-3 rounded-xl text-sm" />
           <button onClick={addItem} className="bg-white text-black font-black rounded-xl hover:bg-emerald-500 transition-colors">ADD</button>
        </div>

        {/* List */}
        <div className="space-y-2">
          {rows.map(r => (
            <div key={r.id} className="bg-white/5 p-4 rounded-2xl flex justify-between items-center border border-white/5 group hover:border-emerald-500/30 transition-all">
               <div>
                 <span className="font-black text-emerald-500 mr-4">{r.totalCarton} CTN</span>
                 <span className="font-bold">{r.brand} - {r.size}"</span>
               </div>
               <div className="flex items-center gap-6">
                 <span className="font-mono text-gray-400">Rs. {r.amount.toLocaleString()}</span>
                 <button onClick={()=>setRows(rows.filter(x=>x.id!==r.id))} className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>
               </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
