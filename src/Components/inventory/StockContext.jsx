import { createContext, useState, useEffect, useCallback, useContext } from 'react';
import { getInventory, addInventory, updateInventory, deleteInventory } from '../../api';

export const StockContext = createContext();
export const useStock = () => useContext(StockContext);

const JAMBO_CATS = ['Clear','Tan','Cloth','Masking','Tissue','SuperYellow','SuperClear','Color','Foam'];

export const StockProvider = ({ children }) => {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);

  const refreshInventory = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getInventory();
      setInventory(data || []);
    } catch (e) { 
      console.error("Refresh Error:", e); 
    } finally { 
      setLoading(false); 
    }
  }, []);

  useEffect(() => { refreshInventory(); }, [refreshInventory]);

  // HELPER: Logic to auto-generate the next Roll Number for Jambo categories
  const generateNextRollNo = (currentInv) => {
    const nums = currentInv
      .filter(i => JAMBO_CATS.includes(i.category || i.type))
      .map(i => parseInt(i.rollNo || i.roll_no || '0', 10))
      .filter(n => !isNaN(n));
    const maxNum = nums.length ? Math.max(...nums) : 0;
    return String(maxNum + 1).padStart(3, '0');
  };

  const addRoll = async (item) => {
    const isJambo = JAMBO_CATS.includes(item.category);
    
    // Auto generate roll number if category is Jambo and rollNo is not provided
    let finalRollNo = item.rollNo;
    if (isJambo && !finalRollNo) {
      finalRollNo = generateNextRollNo(inventory);
    }

    const payload = {
      ...item,
      rollNo: finalRollNo,
      date: item.date || new Date().toLocaleDateString('en-GB') // Ensure date is never empty
    };

    try {
      const saved = await addInventory(payload);
      setInventory(prev => [saved, ...prev]);
      return saved;
    } catch (e) {
      console.error("Add Roll Logic Error:", e);
      throw e;
    }
  };

  const adjustStock = async (item, field, delta) => {
    const id = item._id || item.id;
    if (!id) return;

    const currentVal = Number(item[field]) || 0;
    const newVal = Math.max(0, parseFloat((currentVal + delta).toFixed(4))); // Prevent negative stock

    try {
      const updated = await updateInventory(id, { [field]: newVal });
      setInventory(prev => prev.map(i => (i._id === id || i.id === id) ? { ...i, ...updated } : i));
    } catch (e) {
      console.error("Stock Adjustment Error:", e);
    }
  };

  const resetInventory = async () => {
    if (!window.confirm("WARNING: This will permanently delete ALL data. Proceed?")) return;
    try {
      setLoading(true);
      // Delete all items one by one from Supabase
      await Promise.all(inventory.map(i => deleteInventory(i._id || i.id)));
      setInventory([]);
      alert("Database wiped successfully.");
    } catch (e) {
      alert("Error wiping database: " + e.message);
    } finally {
      refreshInventory();
    }
  };

  return (
    <StockContext.Provider value={{ 
      inventory, 
      loading, 
      refreshInventory, 
      resetInventory, 
      adjustStock, 
      addRoll, 
      setInventory 
    }}>
      {children}
    </StockContext.Provider>
  );
};
