import { createContext, useState, useEffect, useCallback, useContext } from 'react';
import { getInventory, addInventory, updateInventory, deleteInventory } from '../../api';

export const StockContext = createContext();
export const useStock = () => useContext(StockContext);

const JAMBO_CATS = ['Clear','Tan','Cloth','Masking','Tissue','SuperYellow','SuperClear','Color','Foam'];

export const StockProvider = ({ children }) => {
  const [inventory, setInventory] = useState([]);
  const [loading,   setLoading]   = useState(true);

  const refreshInventory = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getInventory();
      setInventory(data);
    } catch (err) { console.error('refreshInventory error:', err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { refreshInventory(); }, [refreshInventory]);

  const addRoll = async (item) => {
    const isJambo = JAMBO_CATS.includes(item.category);
    const payload = { ...item, date: item.date || new Date().toLocaleDateString('en-GB') };
    const saved = await addInventory(payload);
    setInventory(prev => [saved, ...prev]);
    return saved;
  };

  const adjustStock = async (item, field, delta) => {
    if (!item) return;
    const itemId = item.id || item._id;
    const live = inventory.find(i => i.id === itemId || i._id === itemId);
    const currentVal = Number(live ? live[field] : (item[field] || 0));
    const newVal = parseFloat((currentVal + delta).toFixed(4));

    if (newVal <= 0) {
      await deleteInventory(itemId);
      setInventory(prev => prev.filter(i => i.id !== itemId && i._id !== itemId));
    } else {
      const updated = await updateInventory(itemId, { [field]: newVal });
      setInventory(prev => prev.map(i => (i.id === itemId || i._id === itemId) ? updated : i));
    }
  };

  const updateStock = async (id, delta) => {
    const item = inventory.find(i => i.id === id || i._id === id);
    if (item) await adjustStock(item, 'qty', delta);
  };

  const removeItem = async (id) => {
    await deleteInventory(id);
    setInventory(prev => prev.filter(i => i.id !== id && i._id !== id));
  };

  return (
    <StockContext.Provider value={{
      inventory, loading, adjustStock, refreshInventory,
      addRoll, updateStock, removeItem, setInventory
    }}>
      {children}
    </StockContext.Provider>
  );
};
