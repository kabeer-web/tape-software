import { createContext, useState, useEffect, useCallback, useContext } from 'react';
import { getInventory, addInventory, updateInventory, deleteInventory } from '../../api';

export const StockContext = createContext();
export const useStock = () => useContext(StockContext);

const JAMBO_CATS = ['Clear','Tan','Cloth','Masking','Tissue','SuperYellow','SuperClear','Color','Foam'];

export const StockProvider = ({ children }) => {
  const [inventory, setInventory] = useState([]);
  const [loading,   setLoading]   = useState(true);

  // --- NEW ADDITIVE CODE: Notification Center ---
  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem('erp_notifications');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('erp_notifications', JSON.stringify(notifications));
  }, [notifications]);

  const addNotification = (message, type, item) => {
    const newNotif = {
      id: Date.now(),
      message,
      type, // 'warning', 'critical', 'out'
      itemDetails: `${item.brand} ${item.cartonType || item.type} ${item.size}"`,
      qty: item.qty,
      time: new Date().toLocaleString(),
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  const dismissNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const checkLowStockTrigger = (item, currentQty) => {
    if (item.category !== 'Carton') return;
    if (currentQty <= 0) addNotification(`Out of Stock: ${item.brand}`, 'out', item);
    else if (currentQty <= 5) addNotification(`Critical Warning: ${item.brand}`, 'critical', item);
    else if (currentQty <= 10) addNotification(`Warning: ${item.brand}`, 'warning', item);
  };
  // --- END ADDITIVE CODE ---

  const refreshInventory = useCallback(async () => {
    setLoading(true);
    try { setInventory(await getInventory()); }
    catch (e) { console.error('refresh:', e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { refreshInventory(); }, [refreshInventory]);

  const generateRollNo = (inv) => {
    const nums = inv
      .filter(i => JAMBO_CATS.includes(i.category))
      .map(i => parseInt(i.rollNo || i.roll_no || '0', 10))
      .filter(n => !isNaN(n));
    return String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3, '0');
  };

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

  const adjustStock = async (item, field, delta) => {
    if (!item) return;
    const id = item._id || item.id;
    if (!id) return;
    const live = inventory.find(i => i._id === id || i.id === id);
    const curr = Number(live ? (live[field] || 0) : (item[field] || 0));
    const next = parseFloat((curr + delta).toFixed(4));
    
    // Additive Trigger
    if (field === 'qty') checkLowStockTrigger(item, next);

    if (next <= 0) {
      await deleteInventory(id);
      setInventory(prev => prev.filter(i => i._id !== id && i.id !== id));
    } else {
      const upd = await updateInventory(id, { [field]: next });
      setInventory(prev => prev.map(i => (i._id === id || i.id === id) ? { ...i, ...upd } : i));
    }
  };

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

  const editItemYards = async (id, newYards) => {
    const upd = await updateInventory(id, { yards: Number(newYards) });
    setInventory(prev => prev.map(i => i._id === id ? { ...i, ...upd } : i));
  };

  const updateStock = async (id, delta) => {
    const item = inventory.find(i => i._id === id);
    if (!item) return;
    const next = Math.max(0, (Number(item.qty) || 0) + delta);
    
    // Additive Trigger
    checkLowStockTrigger(item, next);

    if (next <= 0) {
      await deleteInventory(id);
      setInventory(prev => prev.filter(i => i._id !== id));
    } else {
      const upd = await updateInventory(id, { qty: next });
      setInventory(prev => prev.map(i => i._id === id ? { ...i, ...upd } : i));
    }
  };

  const removeItem = async (id) => {
    await deleteInventory(id);
    setInventory(prev => prev.filter(i => i._id !== id));
  };

  return (
    <StockContext.Provider value={{
      inventory, loading,
      notifications, dismissNotification, // New Additions
      addRoll, adjustStock,
      issueYards, editItemYards,
      updateStock, removeItem,
      refreshInventory, setInventory,
    }}>
      {children}
    </StockContext.Provider>
  );
};
