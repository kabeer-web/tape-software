import { createContext, useState, useEffect, useCallback, useContext } from 'react';
import { getInventory, addInventory, updateInventory, deleteInventory } from '../../api';

export const StockContext = createContext();

export const useStock = () => {
  const ctx = useContext(StockContext);
  if (!ctx) throw new Error('useStock must be inside StockProvider');
  return ctx;
};

const JAMBO_CATS = ['Clear','Tan','Cloth','Masking','Tissue','SuperYellow','SuperClear','Color','Foam'];

export const StockProvider = ({ children }) => {
  const [inventory, setInventory] = useState([]);
  const [loading,   setLoading]   = useState(true);

  // Fetch logic
  const refreshInventory = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getInventory();
      // Ensure each item has both _id and id for compatibility
      const normalized = data.map(item => ({ ...item, _id: item.id }));
      setInventory(normalized);
    } catch (err) { console.error('refreshInventory error:', err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { refreshInventory(); }, [refreshInventory]);

  const generateRollNo = (currentInv) => {
    const jambos = currentInv.filter(i => JAMBO_CATS.includes(i.category));
    if (!jambos.length) return '001';
    const nums = jambos.map(i => parseInt(i.rollNo || i.roll_no || '0', 10)).filter(n => !isNaN(n));
    const max = nums.length ? Math.max(...nums) : 0;
    return String(max + 1).padStart(3, '0');
  };

  const addRoll = async (item) => {
    const isJambo = JAMBO_CATS.includes(item.category);
    const payload = { ...item, date: item.date || new Date().toLocaleDateString('en-GB') };
    if (isJambo && !payload.rollNo && !payload.roll_no) {
      payload.rollNo = generateRollNo(inventory);
    }
    const saved = await addInventory(payload);
    const withId = { ...saved, _id: saved.id };
    setInventory(prev => [withId, ...prev]);
    return withId;
  };

  const adjustStock = async (item, field, delta) => {
    if (!item) return;
    const itemId = item.id || item._id;
    const live = inventory.find(i => i.id === itemId || i._id === itemId);
    const currentVal = Number(live ? (live[field] || 0) : (item[field] || 0));
    const newVal = parseFloat((currentVal + delta).toFixed(4));
    try {
      if (newVal <= 0) {
        await deleteInventory(itemId);
        setInventory(prev => prev.filter(i => i.id !== itemId && i._id !== itemId));
      } else {
        const updated = await updateInventory(itemId, { [field]: newVal });
        setInventory(prev => prev.map(i => (i.id === itemId || i._id === itemId) ? { ...i, ...updated, _id: itemId } : i));
      }
    } catch (err) { throw err; }
  };

  const issueYards = async (id, qty) => {
    const item = inventory.find(i => i.id === id || i._id === id);
    if (item) await adjustStock(item, 'yards', -qty);
  };

  const editItemYards = async (id, newYards) => {
    const updated = await updateInventory(id, { yards: Number(newYards) });
    setInventory(prev => prev.map(i => (i.id === id || i._id === id) ? { ...i, ...updated } : i));
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
      addRoll, issueYards, editItemYards, updateStock, removeItem, setInventory,
    }}>
      {children}
    </StockContext.Provider>
  );
};
