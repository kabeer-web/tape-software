import { createContext, useState, useEffect, useCallback, useContext } from 'react';
import {
  getInventory, addInventory,
  updateInventory, deleteInventory
} from '../../api';

export const StockContext = createContext();

export const useStock = () => {
  const ctx = useContext(StockContext);
  if (!ctx) throw new Error('useStock must be inside StockProvider');
  return ctx;
};

const JAMBO_CATS = [
  'Clear','Tan','Cloth','Masking','Tissue',
  'SuperYellow','SuperClear','Color','Foam'
];

export const StockProvider = ({ children }) => {
  const [inventory, setInventory] = useState([]);
  const [loading,   setLoading]   = useState(true);

  // ── Fetch all inventory from Supabase ────────────────────
  const refreshInventory = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getInventory();
      setInventory(data);
    } catch (err) {
      console.error('refreshInventory error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refreshInventory(); }, [refreshInventory]);

  // ── Auto generate next Jambo roll number ─────────────────
  const generateRollNo = (currentInv) => {
    const jambos = currentInv.filter(i => JAMBO_CATS.includes(i.category));
    if (!jambos.length) return '001';
    const nums = jambos
      .map(i => parseInt(i.rollNo || i.roll_no || '0', 10))
      .filter(n => !isNaN(n));
    const max = nums.length ? Math.max(...nums) : 0;
    return String(max + 1).padStart(3, '0');
  };

  // ── Add roll / item ──────────────────────────────────────
  const addRoll = async (item) => {
    const isJambo = JAMBO_CATS.includes(item.category);
    const payload = {
      ...item,
      date: item.date || new Date().toLocaleDateString('en-GB'),
    };
    // Auto roll number for Jambo
    if (isJambo && !payload.rollNo && !payload.roll_no) {
      payload.rollNo = generateRollNo(inventory);
    }
    const saved = await addInventory(payload);
    setInventory(prev => [saved, ...prev]);
    return saved;
  };

  // ── Adjust stock by delta (used by Production) ───────────
  // field = 'yards' or 'qty', delta = positive or negative number
  const adjustStock = async (item, field, delta) => {
    if (!item) { console.warn('adjustStock: no item'); return; }
    const itemId = item._id || item.id;
    if (!itemId) { console.warn('adjustStock: no id', item); return; }

    // Get latest value from live state (not stale snapshot)
    const live = inventory.find(i => i._id === itemId || i.id === itemId);
    const currentVal = Number(live ? (live[field] || 0) : (item[field] || 0));
    const newVal = parseFloat((currentVal + delta).toFixed(4));

    try {
      if (newVal <= 0) {
        await deleteInventory(itemId);
        setInventory(prev => prev.filter(i => i._id !== itemId && i.id !== itemId));
      } else {
        const updated = await updateInventory(itemId, { [field]: newVal });
        setInventory(prev => prev.map(i =>
          (i._id === itemId || i.id === itemId) ? { ...i, ...updated } : i
        ));
      }
    } catch (err) {
      console.error('adjustStock failed:', err);
      throw err;
    }
  };

  // ── Helpers for Jambo files (issue yards) ────────────────
  const issueYards = async (id, qty) => {
    const item = inventory.find(i => i._id === id);
    if (!item) return;
    const newYards = parseFloat(((Number(item.yards) || 0) - qty).toFixed(4));
    if (newYards <= 0) {
      await deleteInventory(id);
      setInventory(prev => prev.filter(i => i._id !== id));
    } else {
      const updated = await updateInventory(id, { yards: newYards });
      setInventory(prev => prev.map(i => i._id === id ? { ...i, ...updated } : i));
    }
  };

  // ── Set yards directly (for edit) ───────────────────────
  const editItemYards = async (id, newYards) => {
    const updated = await updateInventory(id, { yards: Number(newYards) });
    setInventory(prev => prev.map(i => i._id === id ? { ...i, ...updated } : i));
  };

  // ── Update Core/Carton qty by delta ─────────────────────
  const updateStock = async (id, delta) => {
    const item = inventory.find(i => i._id === id);
    if (!item) return;
    const newQty = Math.max(0, (Number(item.qty) || 0) + delta);
    if (newQty <= 0) {
      await deleteInventory(id);
      setInventory(prev => prev.filter(i => i._id !== id));
    } else {
      const updated = await updateInventory(id, { qty: newQty });
      setInventory(prev => prev.map(i => i._id === id ? { ...i, ...updated } : i));
    }
  };

  // ── Remove item ─────────────────────────────────────────
  const removeItem = async (id) => {
    await deleteInventory(id);
    setInventory(prev => prev.filter(i => i._id !== id));
  };

  return (
    <StockContext.Provider value={{
      inventory,
      loading,
      // Production
      adjustStock,
      refreshInventory,
      // Jambo files
      addRoll,
      issueYards,
      editItemYards,
      // Core/Carton files
      updateStock,
      removeItem,
      setInventory,
    }}>
      {children}
    </StockContext.Provider>
  );
};