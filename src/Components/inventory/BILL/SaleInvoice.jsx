import { useState, useRef, useContext, useEffect, useMemo } from 'react';
import { 
  Plus, Trash2, Printer, Upload, X, Hash, Calendar, 
  Search, ChevronDown, CheckCircle2, DollarSign
} from 'lucide-react';
import { useAccounts } from '../ACCOUNTS/AccountsContext';

const SALE_PARTIES = ['AR PACKAGES','ROSHAN TRADER','HUZAIFA TRADER','SHAMS STATIONARY','ABDUL RAUF','HAMZULLAH','ANEES STATIONARY','A ONE','ZEESHAN HYD','ABDUL BASIT','MD TRADERS','MUNEER BHAI','ANWAR BHAI','FAROOQ BHAI','GR TRADER','HAMZA SIALKOT','HASHMI TRADER','GAIN TEX INTERNATIONAL','NAQI TAQI','MEMON ELECTRIC','MOK PAKistan TRADER','SABIR BROTHER 1','SABIR BROTHER 2','SHERAZ HABIB','SANAULLAH TEXTILE','SUJJAD ALI','USAMA STATIONARY','ZEESHAN HAIDRABAD','WAHEED WALI','AL FAREED','SHOKAT HAYAT','GUL AMIR','AJ ARSALAN','HAS GR TRADER','MUDASIR MEMON','UMAIR FISHERY','AMEER AKBAR','ISMAIL BHAI','BILAL BHAI','FARHAN NEW KARACHI','N.K ENTERPRISES'];

// --- RESTORED SEARCHABLE PARTY PICKER ---
const PartyPicker = ({ value, onChange, options, placeholder }) => {
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);
  const filtered = options.filter(o => o.toLowerCase().includes(value.toLowerCase()));

  return (
    <div className="relative" ref={boxRef}>
      <div className="relative">
        <input 
          value={value} onChange={e => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)} placeholder={placeholder}
          className="w-full bg-black/40 border border-white/10 p-4 rounded-2xl outline-none focus:border-emerald-500 font-bold text-sm"
        />
        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500" size={16}/>
      </div>
      {open && (
        <div className="absolute z-[3000] mt-2 w-full max-h-60 overflow-y-auto bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl">
          {filtered.map(o => (
            <button key={o} onClick={() => { onChange(o); setOpen(false); }} className="w-full text-left p-4 hover:bg-emerald-500 hover:text-black transition-colors text-xs font-bold border-b border-white/5">
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default function SaleInvoice() {
  const { saveBill } = useAccounts();
  const [billNo, setBillNo] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [date, setDate] = useState(new Date().toLocaleDateString('en-GB'));
  const [rows, setRows] = useState([]);
  const [logo, setLogo] = useState(localStorage.getItem('erp_logo') || null);
  const [popMsg, setPopMsg] = useState('');
  const fileRef = useRef(null);

  // Form for Entry
  const [form, setFormData] = useState({ description: '', debit: '', credit: '' });

  const addItem = () => {
    if (!form.description || (!form.debit && !form.credit)) return;
    const newId = rows.length + 1;
    
    // Running Total Logic like Bank Statement
    let lastTotal = rows.length > 0 ? rows[rows.length - 1].runningTotal : 0;
    const debit = Number(form.debit) || 0;
    const credit = Number(form.credit) || 0;
    const currentTotal = lastTotal + debit - credit;

    setRows([...rows, { 
      id: newId, 
      date: date,
      description: form.description, 
      debit, 
      credit, 
      runningTotal: currentTotal 
    }]);
    setFormData({ description: '', debit: '', credit: '' });
  };

  const printA4 = () => {
    const html = `
      <html>
        <head>
          <style>
            @page { size: A4; margin: 10mm; }
            body { font-family: 'Helvetica', sans-serif; padding: 20px; }
            .bank-header { text-align: center; color: red; font-size: 30px; font-weight: 900; text-transform: uppercase; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { border: 1px solid #000; padding: 10px; background: #f0f0f0; font-size: 14px; font-weight: bold; text-align: left; }
            td { border: 1px solid #000; padding: 8px; font-size: 13px; }
            .text-right { text-align: right; }
            .header-info { display: flex; justify-content: space-between; margin-bottom: 10px; }
          </style>
        </head>
        <body onload="window.print()">
          <div class="bank-header">BANK ACCOUNT JUNE</div>
          <div class="header-info">
             <div><b>PARTY:</b> ${buyerName}</div>
             <div><b>BILL NO:</b> #${billNo}</div>
             <div><b>DATE:</b> ${date}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>ID NO</th><th>DATE</th><th>PARTY&FACTORY</th><th>CASH & CHQ</th><th>DEBIT</th><th>CREDIT</th><th>TOTAL</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map(r => `
                <tr>
                  <td>${r.id}</td>
                  <td>${r.date}</td>
                  <td>${buyerName}</td>
                  <td>${r.description}</td>
                  <td class="text-right">${r.debit || ''}</td>
                  <td class="text-right">${r.credit || ''}</td>
                  <td class="text-right"><b>${r.runningTotal}</b></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>`;
    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
  };

  return (
    <div className="min-h-screen bg-[#070707] text-white p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Section */}
        <div className="flex justify-between items-center mb-10">
          <h1 className="text-5xl font-black italic tracking-tighter uppercase">Sales <span className="text-emerald-500 text-6xl">Statement</span></h1>
          <div className="flex gap-4">
             <button onClick={printA4} className="bg-emerald-500 text-black px-10 py-4 rounded-2xl font-black text-xs uppercase flex items-center gap-2 shadow-xl shadow-emerald-500/20 hover:scale-105 transition-all"><Printer size={18}/> Print A4 Ledger</button>
             <button onClick={() => {}} className="bg-white/5 border border-white/10 px-8 py-4 rounded-2xl font-black text-xs uppercase hover:bg-white hover:text-black transition-all">Save to Database</button>
          </div>
        </div>

        {/* Party & Bill Details */}
        <div className="bg-white/[0.03] border border-white/10 p-10 rounded-[3rem] grid grid-cols-1 md:grid-cols-3 gap-10 backdrop-blur-xl mb-10">
           <div className="space-y-4">
              <label className="text-[10px] font-black text-gray-500 ml-4 uppercase tracking-[0.2em]">Select Buyer Account</label>
              <PartyPicker value={buyerName} onChange={setBuyerName} options={SALE_PARTIES} placeholder="BUYER NAME" />
           </div>
           <div className="space-y-4">
              <label className="text-[10px] font-black text-gray-500 ml-4 uppercase tracking-[0.2em]">Invoice Details</label>
              <div className="relative">
                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500" size={16}/>
                <input value={billNo} onChange={e=>setBillNo(e.target.value)} placeholder="INVOICE NO" className="w-full bg-black/40 border border-white/10 p-4 pl-12 rounded-2xl outline-none font-bold" />
              </div>
           </div>
           <div className="bg-emerald-500/10 rounded-[2.5rem] p-8 border border-emerald-500/20 text-center flex flex-col justify-center">
              <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-2">Final Closing Balance</span>
              <span className="text-5xl font-black tracking-tighter">Rs. {rows.length > 0 ? rows[rows.length-1].runningTotal.toLocaleString() : '0'}</span>
           </div>
        </div>

        {/* Input Row - Exact style of your Ledger table inputs */}
        <div className="bg-white/[0.02] border border-white/5 p-8 rounded-[2.5rem] grid grid-cols-1 md:grid-cols-4 gap-6 mb-10 items-end shadow-2xl">
           <div className="space-y-2">
              <label className="text-[9px] font-black text-gray-500 ml-2 uppercase">Cash & CHQ Details</label>
              <input value={form.description} onChange={e=>setFormData({...form, description: e.target.value})} placeholder="e.g. CHQ CLEAR / CASH REC" className="w-full bg-black border border-white/10 p-4 rounded-xl text-sm font-bold" />
           </div>
           <div className="space-y-2">
              <label className="text-[9px] font-black text-red-500 ml-2 uppercase tracking-widest">Debit (+)</label>
              <input type="number" value={form.debit} onChange={e=>setFormData({...form, debit: e.target.value})} placeholder="BILL AMOUNT" className="w-full bg-black border border-red-500/20 p-4 rounded-xl text-sm font-black text-red-500" />
           </div>
           <div className="space-y-2">
              <label className="text-[9px] font-black text-emerald-500 ml-2 uppercase tracking-widest">Credit (-)</label>
              <input type="number" value={form.credit} onChange={e=>setFormData({...form, credit: e.target.value})} placeholder="PAYMENT REC" className="w-full bg-black border border-emerald-500/20 p-4 rounded-xl text-sm font-black text-emerald-500" />
           </div>
           <button onClick={addItem} className="h-[54px] bg-white text-black font-black rounded-2xl hover:bg-emerald-500 transition-all uppercase text-[10px] tracking-widest shadow-xl">Add Entry</button>
        </div>

        {/* Bank Style Table */}
        <div className="bg-[#111] rounded-[3.5rem] border border-white/5 overflow-hidden shadow-inner">
           <table className="w-full text-left border-separate border-spacing-0">
              <thead className="sticky top-0 bg-[#1a1a1a] z-50">
                 <tr>
                    <th className="p-8 text-[10px] font-black text-gray-400 uppercase border-b border-white/5">ID NO</th>
                    <th className="p-8 text-[10px] font-black text-gray-400 uppercase border-b border-white/5">DATE</th>
                    <th className="p-8 text-[10px] font-black text-gray-400 uppercase border-b border-white/5">PARTY&FACTORY</th>
                    <th className="p-8 text-[10px] font-black text-gray-400 uppercase border-b border-white/5">CASH & CHQ</th>
                    <th className="p-8 text-[10px] font-black text-gray-400 uppercase border-b border-white/5 text-right">DEBIT</th>
                    <th className="p-8 text-[10px] font-black text-gray-400 uppercase border-b border-white/5 text-right">CREDIT</th>
                    <th className="p-8 text-[10px] font-black text-gray-400 uppercase border-b border-white/5 text-right">TOTAL</th>
                    <th className="p-8 border-b border-white/5"></th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rows.map((r, i) => (
                  <tr key={r.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="p-8 font-mono text-xs text-gray-500">{r.id}</td>
                    <td className="p-8 font-mono text-xs text-gray-500">{r.date}</td>
                    <td className="p-8 font-black text-sm uppercase text-gray-200">{buyerName}</td>
                    <td className="p-8 text-sm font-bold uppercase text-gray-400">{r.description}</td>
                    <td className="p-8 text-right font-black text-red-500 text-lg">{r.debit > 0 ? r.debit.toLocaleString() : ''}</td>
                    <td className="p-8 text-right font-black text-emerald-500 text-lg">{r.credit > 0 ? r.credit.toLocaleString() : ''}</td>
                    <td className="p-8 text-right font-black text-2xl tracking-tighter text-white">Rs. {r.runningTotal.toLocaleString()}</td>
                    <td className="p-8 text-right">
                       <button onClick={()=>setRows(rows.filter(x=>x.id!==r.id))} className="text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={18}/></button>
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
