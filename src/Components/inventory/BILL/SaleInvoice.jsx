import { useState, useRef, useContext, useEffect, useMemo } from 'react';
import {
  Plus, Trash2, Printer, Upload, X, CheckCircle2, Database,
  AlertTriangle, ChevronDown, FileDown, Bell
} from 'lucide-react';
import { useAccounts } from '../ACCOUNTS/AccountsContext';
import { StockContext } from '../StockContext';
import { getLedgerEntries } from '../../../api';

const SALE_PARTIES = ['AR PACKAGES','ROSHAN TRADER','HUZAIFA TRADER','SHAMS STATIONARY','ABDUL RAUF','HAMZULLAH','ANEES STATIONARY','A ONE','ZEESHAN HYD','ABDUL BASIT','MD TRADERS','MUNEER BHAI','ANWAR BHAI','FAROOQ BHAI','GR TRADER','HAMZA SIALKOT','HASHMI TRADER','GAIN TEX INTERNATIONAL','NAQI TAQI','MEMON ELECTRIC','MOK PAKISTAN TRADER','SABIR BROTHER 1','SABIR BROTHER 2','SHERAZ HABIB','SANAULLAH TEXTILE','SUJJAD ALI','USAMA STATIONARY','ZEESHAN HAIDRABAD','WAHEED WALI','AL FAREED','SHOKAT HAYAT','GUL AMIR','AJ ARSALAN','HAS GR TRADER','MUDASIR MEMON','UMAIR FISHERY','AMEER AKBAR','ISMAIL BHAI','BILAL BHAI','FARHAN NEW KARACHI','N.K ENTERPRISES'];

const SaleInvoice = () => {
  const { saveBill } = useAccounts();
  const { inventory, updateStock, refreshInventory, addNotification } = useContext(StockContext);

  const [billNo, setBillNo] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [date, setDate] = useState(new Date().toLocaleDateString('en-GB'));
  const [rows, setRows] = useState([]);
  const [logo, setLogo] = useState(localStorage.getItem('erp_logo') || null);
  const [popMsg, setPopMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  const [form, setForm] = useState({
    sizeUnit: 'mm', sizeMm: '', sizeInch: '', yards: '', colour: '', brand: '', micron: '', totalCarton: '', perCtnQty: '', rate: '', cartonType: 'Small', cartonSize: '10'
  });

  // Handle Logo & Persistence
  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setLogo(reader.result);
      localStorage.setItem('erp_logo', reader.result);
    };
    reader.readAsDataURL(file);
  };

  const flash = (text) => { setPopMsg(text); setTimeout(() => setPopMsg(''), 5000); };
  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const matchedStock = useMemo(() => {
    if (!form.brand || !form.cartonSize) return null;
    return inventory.find(i => 
      i.category === 'Carton' && 
      String(i.brand).toLowerCase() === String(form.brand).toLowerCase() && 
      (i.carton_type || i.type) === form.cartonType &&
      parseFloat(i.size) === parseFloat(form.cartonSize)
    );
  }, [form.brand, form.cartonType, form.cartonSize, inventory]);

  const addItem = () => {
    if (!form.totalCarton || !form.rate) return;
    const tc = parseFloat(form.totalCarton);
    const pc = parseFloat(form.perCtnQty || 0);
    const sizeLabel = [form.sizeUnit === 'mm' ? `${form.sizeMm}mm` : `${form.sizeInch}"`, form.yards ? `${form.yards}yds` : ''].filter(Boolean).join(' / ');

    setRows(p => [...p, { 
      id: Date.now(), ...form, sizeLabel, 
      inventoryId: matchedStock?._id || matchedStock?.id, 
      totalQty: tc * pc, total: (tc * pc) * parseFloat(form.rate) 
    }]);
    setForm(prev => ({...prev, totalCarton: '', yards: '', rate: '', perCtnQty: ''}));
  };

  const checkStockLevels = (item, newQty) => {
    const details = `${item.brand} ${item.cartonType} ${item.cartonSize}"`;
    if (newQty <= 0) addNotification(`OUT OF STOCK: ${details}`, 'error');
    else if (newQty <= 5) addNotification(`CRITICAL LOW STOCK: ${details} (${newQty} left)`, 'warning');
    else if (newQty <= 10) addNotification(`LOW STOCK WARNING: ${details} (${newQty} left)`, 'info');
  };

  const handleSave = async () => {
    if (!buyerName.trim() || rows.length === 0) return;
    setSaving(true);
    try {
      await saveBill({
        billType: 'Sale', billNo, partyName: buyerName, date, items: rows,
        grandTotal: rows.reduce((s,r)=>s+r.total,0),
        totalCartonCount: rows.reduce((s,r)=>s+Number(r.totalCarton),0),
        logo
      });

      for (const row of rows) {
        if (row.inventoryId) {
          const target = inventory.find(i => i._id === row.inventoryId);
          const newStock = (target?.qty || 0) - Number(row.totalCarton);
          await updateStock(row.inventoryId, -Number(row.totalCarton));
          checkStockLevels(row, newStock);
        }
      }

      flash(`✅ Bill #${billNo} Saved Successfully!`);
      setRows([]); setBillNo(''); setBuyerName('');
      refreshInventory();
    } catch (err) { flash('❌ Error: ' + err.message); } 
    finally { setSaving(false); }
  };

  const printPDF = () => {
    const grandTotal = rows.reduce((s, r) => s + r.total, 0);
    const html = `
      <html>
        <head>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #333; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 20px; }
            .logo { height: 80px; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background: #f4f4f4; padding: 10px; border: 1px solid #ddd; text-align: left; }
            td { padding: 10px; border: 1px solid #ddd; }
            .total-section { margin-top: 30px; text-align: right; }
            .footer { margin-top: 50px; font-size: 12px; border-top: 1px solid #eee; padding-top: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>${logo ? `<img src="${logo}" class="logo"/>` : '<h1>HS PACKAGES</h1>'}</div>
            <div style="text-align:right">
              <h2>SALES INVOICE</h2>
              <p>Bill #: ${billNo}</p>
              <p>Date: ${date}</p>
            </div>
          </div>
          <div class="info-grid">
            <div><strong>CUSTOMER:</strong><br/>${buyerName}</div>
            <div style="text-align:right"><strong>FROM:</strong><br/>HS Packages Karachi</div>
          </div>
          <table>
            <thead>
              <tr><th>Description</th><th>Qty (Ctn)</th><th>Total Pcs</th><th>Rate</th><th>Amount</th></tr>
            </thead>
            <tbody>
              ${rows.map(r => `<tr><td>${r.brand} ${r.colour} (${r.sizeLabel})</td><td>${r.totalCarton}</td><td>${r.totalQty}</td><td>${r.rate}</td><td>${r.total.toLocaleString()}</td></tr>`).join('')}
            </tbody>
          </table>
          <div class="total-section">
            <h3>Grand Total: Rs. ${grandTotal.toLocaleString()}</h3>
          </div>
          <div class="footer">Printed on ${new Date().toLocaleString()} | Authorized Signature: _________________</div>
        </body>
      </html>
    `;
    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    win.print();
  };

  return (
    <div className="text-white min-h-screen pb-10 max-w-7xl mx-auto px-4 font-sans">
      {/* Header & Save/PDF Actions */}
      <div className="flex justify-between items-center mb-8 pt-8">
        <div>
          <h1 className="text-4xl font-black italic text-[#10b981]">HS <span className="text-white">PACKAGES</span></h1>
          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">Smart Invoicing System</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleSave} disabled={saving || rows.length === 0} className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-6 py-3 rounded-2xl font-black text-xs hover:bg-emerald-500 hover:text-black transition-all">
            {saving ? 'SAVING...' : 'SAVE TO DB'}
          </button>
          <button onClick={printPDF} disabled={rows.length === 0} className="bg-white/10 text-white px-6 py-3 rounded-2xl font-black text-xs flex items-center gap-2">
            <FileDown size={16}/> SAVE AS PDF
          </button>
        </div>
      </div>

      {/* Logo & Info Section */}
      <div className="bg-white/[0.03] border border-white/10 p-8 rounded-[2.5rem] mb-6 flex items-center gap-8 backdrop-blur-xl">
        <div className="shrink-0 text-center">
          {logo ? (
            <div className="relative group">
              <img src={logo} className="h-24 w-auto object-contain rounded-xl border border-white/10 p-2 bg-black/20"/>
              <button onClick={()=>{setLogo(null); localStorage.removeItem('erp_logo');}} className="absolute -top-2 -right-2 bg-red-600 rounded-full p-1 opacity-0 group-hover:opacity-100 transition"><X size={12}/></button>
            </div>
          ) : (
            <button onClick={()=>fileRef.current?.click()} className="w-28 h-24 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center text-gray-500 hover:border-[#10b981] transition-all">
              <Upload size={24}/>
              <span className="text-[8px] font-black mt-1 uppercase">Insert Logo</span>
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden"/>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1">
          <div className="space-y-1">
            <label className="text-[10px] text-gray-500 uppercase font-black ml-2">Invoice #</label>
            <input value={billNo} onChange={e=>setBillNo(e.target.value)} placeholder="001" className="w-full bg-black/40 p-4 rounded-2xl border border-white/5 outline-none focus:border-emerald-500"/>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-gray-500 uppercase font-black ml-2">Customer</label>
            <select value={buyerName} onChange={e=>setBuyerName(e.target.value)} className="w-full bg-black/40 p-4 rounded-2xl border border-white/5 outline-none focus:border-emerald-500">
              <option value="">Select Party</option>
              {SALE_PARTIES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-gray-500 uppercase font-black ml-2">Date</label>
            <input value={date} onChange={e=>setDate(e.target.value)} className="w-full bg-black/40 p-4 rounded-2xl border border-white/5 outline-none font-bold text-slate-400"/>
          </div>
        </div>
      </div>

      {/* Add Items UI (Preserved from original) */}
      {/* ... [Insert your original Add Item Grid and Matched Stock UI here] ... */}

      {/* Rows Table */}
      <div className="bg-white/[0.01] border border-white/5 rounded-[2.5rem] overflow-hidden mt-8">
        <table className="w-full text-left">
          <thead className="bg-white/5 text-[10px] font-black text-gray-500 uppercase">
            <tr><th className="p-6">Description</th><th className="text-center">CTN</th><th className="text-center">Rolls</th><th className="text-right">Rate</th><th className="text-right p-6">Amount</th><th className="p-6"></th></tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.map(r => (
              <tr key={r.id} className="hover:bg-white/5 transition-all">
                <td className="p-6 font-bold uppercase">{r.brand} - {r.colour} <small className="text-gray-500">({r.sizeLabel})</small></td>
                <td className="text-center font-black text-[#10b981] text-2xl">{r.totalCarton}</td>
                <td className="text-center text-gray-400 font-bold">{r.totalQty} PCS</td>
                <td className="text-right text-gray-300">{Number(r.rate).toLocaleString()}</td>
                <td className="text-right font-black text-white text-2xl p-6">Rs. {r.total.toLocaleString()}</td>
                <td className="p-6 text-right"><button onClick={()=>setRows(rows.filter(x=>x.id!==r.id))} className="text-red-500/30 hover:text-red-500 transition-all"><Trash2 size={16}/></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SaleInvoice;
