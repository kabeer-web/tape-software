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
    try { setInventory(await getInventory()); }
    catch (e) { console.error('refresh:', e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { refreshInventory(); }, [refreshInventory]);

  // Auto roll number for Jambo
  const generateRollNo = (inv) => {
    const nums = inv
      .filter(i => JAMBO_CATS.includes(i.category))
      .map(i => parseInt(i.rollNo || i.roll_no || '0', 10))
      .filter(n => !isNaN(n));
    return String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3, '0');
  };

  // Add roll/item
  const addRoll = async (item) => {
    const isJambo = JAMBO_CATS.includes(item.category);
    const payload = {
      ...item,
      date: item.date || new Date().toLocaleDateString('en-GB'),
      ...(isJambo && !item.rollNo && !item.roll_no && { rollNo: generateRollNo(inventory) }),
    };
    const saved = await addInventory(payload);
    setInventory(prev => [saved, ...prev]);
    return saved;
  };

  // adjustStock — used by Production (delta can be + or -)
  const adjustStock = async (item, field, delta) => {
    if (!item) return;
    const id = item._id || item.id;
    if (!id) return;
    const live = inventory.find(i => i._id === id || i.id === id);
    const curr = Number(live ? (live[field] || 0) : (item[field] || 0));
    const next = parseFloat((curr + delta).toFixed(4));
    if (next <= 0) {
      await deleteInventory(id);
      setInventory(prev => prev.filter(i => i._id !== id && i.id !== id));
    } else {
      const upd = await updateInventory(id, { [field]: next });
      setInventory(prev => prev.map(i => (i._id === id || i.id === id) ? { ...i, ...upd } : i));
    }
  };

  // issueYards — Jambo files issue/minus yards
  const issueYards = async (id, qty) => {
    const item = inventory.find(i => i._id === id);
    if (!item) return;
    const next = parseFloat(((Number(item.yards) || 0) - qty).toFixed(4));
    if (next <= 0) {
      await deleteInventory(id);
      setInventory(prev => prev.filter(i => i._id !== id));
    } else {
      const upd = await updateInventory(id, { yards: next });
      setInventory(prev => prev.map(i => i._id === id ? { ...i, ...upd } : i));
    }
  };

  // editItemYards — set yards directly
  const editItemYards = async (id, newYards) => {
    const upd = await updateInventory(id, { yards: Number(newYards) });
    setInventory(prev => prev.map(i => i._id === id ? { ...i, ...upd } : i));
  };

  // updateStock — Core/Carton qty adjust
  const updateStock = async (id, delta) => {
    const item = inventory.find(i => i._id === id);
    if (!item) return;
    const next = Math.max(0, (Number(item.qty) || 0) + delta);
    if (next <= 0) {
      await deleteInventory(id);
      setInventory(prev => prev.filter(i => i._id !== id));
    } else {
      const upd = await updateInventory(id, { qty: next });
      setInventory(prev => prev.map(i => i._id === id ? { ...i, ...upd } : i));
    }
  };

  // removeItem — permanent delete
  const removeItem = async (id) => {
    await deleteInventory(id);
    setInventory(prev => prev.filter(i => i._id !== id));
  };

  return (
    <StockContext.Provider value={{
      inventory, loading,
      addRoll, adjustStock,
      issueYards, editItemYards,
      updateStock, removeItem,
      refreshInventory, setInventory,
    }}>
      {children}
    </StockContext.Provider>
  );
};
