import { createContext, useState, useEffect, useCallback, useContext } from 'react';
import { getInventory, updateInventory, deleteInventory } from '../../api';

export const StockContext = createContext();
export const useStock = () => useContext(StockContext);

export const StockProvider = ({ children }) => {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);

  const refreshInventory = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getInventory();
      setInventory(data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { refreshInventory(); }, [refreshInventory]);

  const adjustStockById = async (id, delta) => {
    const item = inventory.find(i => i._id === id || i.id === id);
    if (!item) return;
    const next = Math.max(0, (Number(item.qty) || 0) + delta);
    const updated = await updateInventory(id, { qty: next });
    setInventory(prev => prev.map(i => i.id === id ? { ...i, ...updated } : i));
  };

  return (
    <StockContext.Provider value={{ inventory, loading, refreshInventory, adjustStockById }}>
      {children}
    </StockContext.Provider>
  );
};
