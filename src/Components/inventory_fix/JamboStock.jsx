import { useState, useContext, useEffect } from 'react';
import { StockContext } from "/src/Components/inventory/StockContext";

const JamboStock = () => {
  const { addRoll, inventory } = useContext(StockContext);
  
  // Local state for UI inputs
  const [formData, setFormData] = useState({ date: '', width: '', totalYards: '' });
  const [searchTerm, setSearchTerm] = useState('');

  // Filtering inventory locally for this category
  const filteredStock = inventory.filter(item => 
    item.category === 'Clear' && 
    String(item.rollNo).includes(searchTerm)
  );

  const addStock = () => {
    if (!formData.totalYards) return;
    
    // addRoll ko data bhej rahe hain, rollNo context khud generate karega
    addRoll({
      category: 'Clear',
      width: formData.width,
      yards: parseFloat(formData.totalYards),
      date: formData.date || new Date().toLocaleDateString()
    });

    // Reset form
    setFormData({ date: '', width: '', totalYards: '' });
  };

  return (
    <div className="p-8 bg-[#121212] border border-[#22c55e]/20 rounded-3xl text-white w-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-black text-[#22c55e]">Clear Tape Inventory</h2>
        <input 
          placeholder="Search Roll No..." 
          className="bg-[#0a0a0a] border border-[#22c55e]/20 px-4 py-2 rounded-xl focus:outline-none"
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Input Form */}
      <div className="grid grid-cols-4 gap-4 mb-8 bg-[#0a0a0a] p-6 rounded-2xl border border-[#22c55e]/10">
        <input type="date" className="bg-[#121212] p-3 rounded-lg border" onChange={(e) => setFormData({...formData, date: e.target.value})} value={formData.date} />
        <input placeholder="Width" className="bg-[#121212] p-3 rounded-lg border" onChange={(e) => setFormData({...formData, width: e.target.value})} value={formData.width} />
        <input placeholder="Total Yards" className="bg-[#121212] p-3 rounded-lg border" onChange={(e) => setFormData({...formData, totalYards: e.target.value})} value={formData.totalYards} />
        <button onClick={addStock} className="bg-[#22c55e] text-black font-bold rounded-lg">Add Roll</button>
      </div>

      {/* Table */}
      <table className="w-full text-left">
        <thead>
          <tr className="text-gray-500 border-b border-[#22c55e]/20">
            <th className="pb-4">Date</th>
            <th className="pb-4">Roll No</th>
            <th className="pb-4">Width</th>
            <th className="pb-4">Yards</th>
          </tr>
        </thead>
        <tbody>
          {filteredStock.map((item) => (
            <tr key={item.id} className="border-b border-[#22c55e]/10">
              <td className="py-4">{item.date}</td>
              <td className="py-4 font-bold text-[#22c55e]">#{item.rollNo}</td>
              <td className="py-4">{item.width}</td>
              <td className="py-4 font-bold">{item.yards}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default JamboStock;