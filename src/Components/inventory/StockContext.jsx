import { createContext, useState, useEffect, useCallback, useContext } from 'react';
import { getInventory, addInventory, updateInventory, deleteInventory } from '../../api';

export const StockContext = createContext();
export const useStock = () => useContext(StockContext);

export const StockProvider = ({ children }) => {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);

  const refreshInventory = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getInventory();
      setInventory(data);
    } catch (e) { 
      console.error("Refresh Error:", e); 
    } finally { 
      setLoading(false); 
    }
  }, []);

  useEffect(() => { refreshInventory(); }, [refreshInventory]);

  // FIX: Added missing resetInventory
  const resetInventory = async () => {
    if (!window.confirm("FATAL: Wipe entire inventory database?")) return;
    try {
      setLoading(true);
      for (const item of inventory) {
        await deleteInventory(item._id);
      }
      setInventory([]);
      alert("Database Wiped.");
    } catch (e) {
      alert("Reset failed: " + e.message);
    } finally {
      refreshInventory();
    }
  };

  // FIX: Prevent negative stock
  const adjustStock = async (item, field, delta) => {
    const id = item._id || item.id;
    const currentVal = Number(item[field]) || 0;
    const newVal = Math.max(0, parseFloat((currentVal + delta).toFixed(4)));

    try {
      const updated = await updateInventory(id, { [field]: newVal });
      setInventory(prev => prev.map(i => i._id === id ? { ...i, ...updated } : i));
    } catch (e) {
      console.error("Adjust Error:", e);
    }
  };

  const addRoll = async (item) => {
    const saved = await addInventory({ ...item, id: crypto.randomUUID() });
    setInventory(prev => [saved, ...prev]);
    return saved;
  };

  return (
    <StockContext.Provider value={{ 
      inventory, loading, refreshInventory, resetInventory, 
      adjustStock, addRoll, setInventory 
    }}>
      {children}
    </StockContext.Provider>
  );
};
