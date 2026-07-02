import { createContext, useState, useEffect, useCallback, useContext } from 'react';
import { getInventory, addInventory, updateInventory, deleteInventory } from '../../api';

export const StockContext = createContext();
export const useStock = () => useContext(StockContext);

const JAMBO_CATS = ['Clear','Tan','Cloth','Masking','Tissue','SuperYellow','SuperClear','Color','Foam'];
// StockContext.jsx ke upar initialize hamesha array se karein:
export const StockProvider = ({ children }) => {
  const [inventory, setInventory] = useState([]); // Array guarantee
  const [loading, setLoading] = useState(true);

  // ... fetch inventory code ...
  // setInventory(data || []); // Kabhi null nahi bhejna

  const refreshInventory = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getInventory();
      setInventory(data || []);
    } catch (e) { console.error(e); } 
    finally { setLoading(false); }
  }, []);

  useEffect(() => { refreshInventory(); }, [refreshInventory]);

  const addRoll = async (item) => {
    const payload = {
      ...item,
      category: item.category || 'Jambo',
      date: item.date || new Date().toLocaleDateString('en-GB')
    };

    try {
      const saved = await addInventory(payload);
      setInventory(prev => [saved, ...prev]);
      return saved;
    } catch (e) {
      console.error("Add Error:", e);
      throw e;
    }
  };

  // ✅ New: Direct Update (Used by Carton pages)
  const updateStock = async (id, delta) => {
    const item = inventory.find(i => i._id === id || i.id === id);
    if (!item) return;
    const newVal = Math.max(0, (Number(item.qty) || 0) + delta);
    try {
      const updated = await updateInventory(item._id || item.id, { qty: newVal });
      setInventory(prev => prev.map(i => (i._id === id || i.id === id) ? updated : i));
    } catch (e) { alert("Update failed"); }
  };

  // ✅ New: Remove Item (Used by Carton pages)
  const removeItem = async (id) => {
    try {
      await deleteInventory(id);
      setInventory(prev => prev.filter(i => i._id !== id && i.id !== id));
    } catch (e) { alert("Delete failed"); }
  };

  const adjustStock = async (item, field, delta) => {
    const id = item._id || item.id;
    const currentVal = Number(item[field]) || 0;
    const newVal = Math.max(0, parseFloat((currentVal + delta).toFixed(4)));
    try {
      const updated = await updateInventory(id, { [field]: newVal });
      setInventory(prev => prev.map(i => (i._id === id) ? updated : i));
    } catch (e) { console.error(e); }
  };

  return (
    <StockContext.Provider value={{ 
      inventory, loading, refreshInventory, 
      adjustStock, addRoll, updateStock, removeItem, setInventory 
    }}>
      {children}
    </StockContext.Provider>
  );
};
