import { useState, useRef, useEffect, useMemo } from 'react';
import { Plus, Trash2, Printer, Save, Hash, User, Truck, Package, X, ChevronDown } from 'lucide-react';
import { addBill, syncProductStock } from '../../../api';
import { useStock } from '../StockContext';

// --- NUMBER TO WORDS HELPER ---
const amountToWords = (num) => {
    const a = ['','One ','Two ','Three ','Four ','Five ','Six ','Seven ','Eight ','Nine ','Ten ','Eleven ','Twelve ','Thirteen ','Fourteen ','Fifteen ','Sixteen ','Seventeen ','Eighteen ','Nineteen '];
    const b = ['', '', 'Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
    if ((num = num.toString()).length > 9) return 'overflow';
    let n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return ''; 
    let str = '';
    str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
    str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
    str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
    str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
    str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) + 'Only ' : '';
    return str.toUpperCase();
};

export default function SaleInvoice() {
  const { inventory } = useStock();
  const [loading, setLoading] = useState(false);
  
  // Invoice Header State
  const [header, setHeader] = useState({
    partyName: '',
    vehicleNo: '',
    receiverName: '',
    date: new Date().toISOString().split('T')[0]
  });

  // Items State
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({
    brand: '', type: '', size: '', color: '', height: '', mic: '', cartons: '', perCtn: '', rate: ''
  });

  // Calculations
  const totals = useMemo(() => {
    const grandTotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
    const totalCartons = items.reduce((sum, item) => sum + Number(item.cartons), 0);
    return { grandTotal, totalCartons, amountInWords: amountToWords(grandTotal) };
  }, [items]);

  const addItem = () => {
    if (!form.brand || !form.cartons || !form.rate) return;
    const qty = Number(form.cartons) * Number(form.perCtn || 1);
    const lineTotal = qty * Number(form.rate);
    
    setItems([...items, { ...form, qty, lineTotal, id: crypto.randomUUID() }]);
    setForm({ brand: '', type: '', size: '', color: '', height: '', mic: '', cartons: '', perCtn: '', rate: '' });
  };

  const saveInvoice = async () => {
    if (!header.partyName || items.length === 0) return alert("Select Party and Add Items!");
    setLoading(true);
    try {
      // 1. Save Bill to Supabase
      const billData = { ...header, items, ...totals };
      const savedBill = await addBill(billData);

      // 2. Reduce Stock for each item (Inventory Sync)
      for (const item of items) {
        await syncProductStock(item.brand, item.size, item.type, -item.qty);
      }

      alert(`Invoice #${savedBill.bill_no} Saved & Stock Updated!`);
      setItems([]);
      setHeader({ partyName: '', vehicleNo: '', receiverName: '', date: new Date().toISOString().split('T')[0] });
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070707] text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto print:max-w-none print:p-0">
        
        {/* Actions Bar (Hidden in Print) */}
        <div className="flex justify-between items-center mb-8 print:hidden">
          <h1 className="text-4xl font-black italic text-emerald-500 uppercase tracking-tighter">Sales Invoice</h1>
          <div className="flex gap-4">
            <button onClick={() => window.print()} className="bg-white/5 border border-white/10 px-6 py-3 rounded-2xl flex items-center gap-2 hover:bg-white/10 transition-all font-bold">
              <Printer size={18}/> Print A4
            </button>
            <button onClick={saveInvoice} disabled={loading} className="bg-emerald-500 text-black px-10 py-3 rounded-2xl flex items-center gap-2 hover:scale-105 transition-all font-black uppercase">
              <Save size={18}/> {loading ? 'Saving...' : 'Save & Sync'}
            </button>
          </div>
        </div>

        {/* Invoice Container (A4 Look) */}
        <div className="bg-[#0c0c0c] border border-white/10 rounded-[2.5rem] p-10 shadow-2xl print:bg-white print:text-black print:border-0 print:p-0 print:rounded-none">
          
          {/* Header Section */}
          <div className="flex justify-between items-start mb-12 pb-8 border-b border-white/5 print:border-black">
            <div>
              <h2 className="text-4xl font-black italic text-emerald-500 mb-2">BEER<span className="text-white print:text-black">FLOW</span></h2>
              <p className="text-xs text-gray-500 font-bold tracking-widest uppercase">Premium Tape Solutions</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 uppercase font-black tracking-widest mb-1">Invoice Date</p>
              <input type="date" value={header.date} onChange={e => setHeader({...header, date: e.target.value})} className="bg-transparent text-right font-bold outline-none border-b border-white/10 focus:border-emerald-500 print:border-0" />
            </div>
          </div>

          {/* Customer Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12 print:grid-cols-3">
            <div className="space-y-4">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block">Buyer Details</label>
              <input placeholder="Buyer Name" value={header.partyName} onChange={e => setHeader({...header, partyName: e.target.value})} className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none focus:border-emerald-500 font-bold print:bg-transparent print:border-0 print:p-0" />
            </div>
            <div className="space-y-4">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block">Vehicle Number</label>
              <input placeholder="Ex: ABC-123" value={header.vehicleNo} onChange={e => setHeader({...header, vehicleNo: e.target.value})} className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none focus:border-emerald-500 font-bold print:bg-transparent print:border-0 print:p-0" />
            </div>
            <div className="space-y-4">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block">Receiver Name</label>
              <input placeholder="Name" value={header.receiverName} onChange={e => setHeader({...header, receiverName: e.target.value})} className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none focus:border-emerald-500 font-bold print:bg-transparent print:border-0 print:p-0" />
            </div>
          </div>

          {/* Item Entry Form (Hidden in Print) */}
          <div className="bg-white/[0.02] border border-white/5 p-8 rounded-[2rem] mb-12 print:hidden">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
              <input placeholder="Brand" list="brands" value={form.brand} onChange={e => setForm({...form, brand: e.target.value})} className="bg-black border border-white/10 p-3 rounded-xl text-sm" />
              <input placeholder="Type" value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="bg-black border border-white/10 p-3 rounded-xl text-sm" />
              <input placeholder="Size" value={form.size} onChange={e => setForm({...form, size: e.target.value})} className="bg-black border border-white/10 p-3 rounded-xl text-sm" />
              <input placeholder="Color" value={form.color} onChange={e => setForm({...form, color: e.target.value})} className="bg-black border border-white/10 p-3 rounded-xl text-sm" />
              <input placeholder="Height" value={form.height} onChange={e => setForm({...form, height: e.target.value})} className="bg-black border border-white/10 p-3 rounded-xl text-sm" />
              <input placeholder="MIC" value={form.mic} onChange={e => setForm({...form, mic: e.target.value})} className="bg-black border border-white/10 p-3 rounded-xl text-sm" />
              <input placeholder="Cartons" type="number" value={form.cartons} onChange={e => setForm({...form, cartons: e.target.value})} className="bg-black border border-white/10 p-3 rounded-xl text-sm" />
              <input placeholder="Per CTN" type="number" value={form.perCtn} onChange={e => setForm({...form, perCtn: e.target.value})} className="bg-black border border-white/10 p-3 rounded-xl text-sm" />
              <input placeholder="Rate" type="number" value={form.rate} onChange={e => setForm({...form, rate: e.target.value})} className="bg-black border border-white/10 p-3 rounded-xl text-sm" />
              <button onClick={addItem} className="bg-emerald-500 text-black font-black rounded-xl text-[10px] uppercase tracking-widest hover:bg-emerald-400">Add Entry</button>
            </div>
            <datalist id="brands">
              {[...new Set(inventory.map(i => i.brand))].map(b => <option key={b} value={b} />)}
            </datalist>
          </div>

          {/* ERP Table */}
          <div className="overflow-hidden rounded-3xl border border-white/5 mb-12 print:border-black print:rounded-none">
            <table className="w-full text-left border-collapse">
              <thead className="bg-white/5 print:bg-transparent">
                <tr className="text-[10px] font-black text-gray-500 uppercase tracking-widest print:text-black">
                  <th className="p-5 border-b border-white/5 print:border-black">Description</th>
                  <th className="p-5 border-b border-white/5 print:border-black text-center">Specs</th>
                  <th className="p-5 border-b border-white/5 print:border-black text-center">CTN</th>
                  <th className="p-5 border-b border-white/5 print:border-black text-center">Qty</th>
                  <th className="p-5 border-b border-white/5 print:border-black text-right">Rate</th>
                  <th className="p-5 border-b border-white/5 print:border-black text-right">Total</th>
                  <th className="p-5 border-b border-white/5 print:hidden"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 print:divide-black">
                {items.map((item, idx) => (
                  <tr key={item.id} className="text-sm font-bold print:text-black">
                    <td className="p-5">
                        <p>{item.brand} - {item.type}</p>
                        <p className="text-[10px] text-gray-500">{item.color}</p>
                    </td>
                    <td className="p-5 text-center text-xs">{item.size} / {item.mic} / {item.height}</td>
                    <td className="p-5 text-center">{item.cartons} <small className="opacity-40">CTN</small></td>
                    <td className="p-5 text-center">{item.qty} <small className="opacity-40">U</small></td>
                    <td className="p-5 text-right font-mono">{Number(item.rate).toLocaleString()}</td>
                    <td className="p-5 text-right font-black text-emerald-500 print:text-black">{item.lineTotal.toLocaleString()}</td>
                    <td className="p-5 text-right print:hidden">
                      <button onClick={() => setItems(items.filter(i => i.id !== item.id))} className="text-red-500 hover:bg-red-500/10 p-2 rounded-lg transition-all">
                        <Trash2 size={16}/>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer Logic */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-end">
            <div className="space-y-6">
                <div>
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Amount in Words</p>
                  <p className="text-sm font-black italic text-emerald-500 print:text-black">{totals.amountInWords}</p>
                </div>
                <div className="pt-8 border-t border-white/5 print:border-black flex gap-20">
                    <div className="text-center">
                        <div className="w-32 border-b border-white/20 mb-2 print:border-black"></div>
                        <p className="text-[9px] font-black text-gray-500 uppercase">Authorized Sign</p>
                    </div>
                    <div className="text-center">
                        <div className="w-32 border-b border-white/20 mb-2 print:border-black"></div>
                        <p className="text-[9px] font-black text-gray-500 uppercase">Receiver Sign</p>
                    </div>
                </div>
            </div>
            
            <div className="bg-white/5 p-8 rounded-[2.5rem] space-y-4 print:bg-transparent print:p-0">
               <div className="flex justify-between text-gray-500 font-bold uppercase text-[10px]">
                  <span>Total Cartons</span>
                  <span className="text-white print:text-black">{totals.totalCartons} CTN</span>
               </div>
               <div className="flex justify-between items-center pt-4 border-t border-white/5 print:border-black">
                  <span className="text-sm font-black uppercase">Grand Total</span>
                  <span className="text-4xl font-black text-emerald-500 print:text-black">Rs. {totals.grandTotal.toLocaleString()}</span>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
