import { useState, useContext, useEffect, useMemo } from 'react';
import { StockContext } from './StockContext';
import {
  getInventoryByRoll, getProductions,
  addProduction, updateProduction, deleteProduction, updateInventory
} from '../../api';
import {
  Factory, Search, Plus, Trash2, Pencil, Check, X,
  AlertTriangle, Info, Database, History, ArrowRight,
  TrendingDown, CheckCircle2, Calculator, Calendar, Layers
} from 'lucide-react';

const Production = () => {
  const { inventory, refreshInventory } = useContext(StockContext);
  const [productions, setProductions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toLocaleDateString('en-GB'),
    rollNo: '',
    producedQty: '',
    waste: '0'
  });

  useEffect(() => {
    loadProductions();
  }, []);

  const loadProductions = async () => {
    try {
      const data = await getProductions();
      setProductions(data);
    } catch (e) { console.error(e); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      // 1. Search Roll
      const roll = await getInventoryByRoll(form.rollNo);
      if (!roll) {
        alert("Roll number not found!");
        return;
      }

      // 2. Save Production
      const saved = await addProduction({
        ...form,
        roll_id: roll._id,
        timestamp: new Date().toISOString()
      });

      // 3. Update Inventory (Reduce length or weight)
      const newLength = Math.max(0, (roll.length || 0) - (parseFloat(form.producedQty) || 0));
      await updateInventory(roll._id, { length: newLength });

      alert("Production recorded successfully!");
      setForm({ ...form, rollNo: '', producedQty: '' });
      loadProductions();
      refreshInventory();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this record?")) return;
    try {
      await deleteProduction(id);
      loadProductions();
    } catch (e) { alert(e.message); }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Factory className="text-blue-600" /> Production Management
        </h1>

        {/* Entry Form */}
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Jambo Roll No</label>
              <input 
                type="text" 
                className="w-full border rounded-lg p-2" 
                value={form.rollNo}
                onChange={e => setForm({...form, rollNo: e.target.value})}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Used Length (Mtrs)</label>
              <input 
                type="number" 
                className="w-full border rounded-lg p-2" 
                value={form.producedQty}
                onChange={e => setForm({...form, producedQty: e.target.value})}
                required
              />
            </div>
            <div className="flex items-end">
              <button 
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
              >
                {loading ? 'Processing...' : 'Record Production'}
              </button>
            </div>
          </div>
        </form>

        {/* History Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-4 font-semibold">Date</th>
                <th className="p-4 font-semibold">Roll No</th>
                <th className="p-4 font-semibold">Qty Used</th>
                <th className="p-4 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {productions.map(p => (
                <tr key={p._id} className="border-b hover:bg-gray-50">
                  <td className="p-4">{p.date}</td>
                  <td className="p-4 font-mono">{p.rollNo}</td>
                  <td className="p-4">{p.producedQty} mtrs</td>
                  <td className="p-4">
                    <button onClick={() => handleDelete(p._id)} className="text-red-500 hover:text-red-700">
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Production;
