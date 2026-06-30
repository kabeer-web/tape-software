import { createContext, useState, useEffect, useCallback, useContext } from 'react';
import { getInventory, addInventory, updateInventory, deleteInventory } from '../../api';

export const StockContext = createContext();
export const useStock = () => useContext(StockContext);

const JAMBO_CATS = ['Clear','Tan','Cloth','Masking','Tissue','SuperYellow','SuperClear','Color','Foam'];
const NOTIF_STORAGE_KEY = 'erp_notifications';

export const StockProvider = ({ children }) => {
  const [inventory, setInventory] = useState([]);
  const [loading,   setLoading]   = useState(true);
  
  // Notification State
  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem(NOTIF_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  // Persist notifications to local storage
  useEffect(() => {
    localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(notifications));
  }, [notifications]);

  const refreshInventory = useCallback(async () => {
    setLoading(true);
    try { 
      const data = await getInventory();
      setInventory(data); 
    }
    catch (e) { console.error('refresh error:', e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { refreshInventory(); }, [refreshInventory]);

  // --- NOTIFICATION HELPERS ---
  const addNotification = useCallback((message, type, itemDetails) => {
    const id = Date.now();
    const newNotif = {
      id,
      message,
      type, // 'warning' (10), 'critical' (5), 'error' (0)
      details: itemDetails, // { brand, size, type }
      time: new Date().toLocaleTimeString(),
      isRead: false
    };
    setNotifications(prev => [newNotif, ...prev]);
  }, []);

  const dismissNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  // Check stock levels specifically for Cartons
  const checkLowStock = (item, nextQty) => {
    if (item.category !== 'Carton') return;

    const details = {
      brand: item.brand,
      cartonType: item.cartonType || item.type,
      size: item.size
    };
    const productLabel = `${details.brand} ${details.cartonType} (${details.size}")`;

    if (nextQty === 0) {
      addNotification(`${productLabel} is now OUT OF STOCK!`, 'error', details);
    } else if (nextQty <= 5) {
      addNotification(`CRITICAL WARNING: ${productLabel} reached ${nextQty} cartons.`, 'critical', details);
    } else if (nextQty <= 10) {
      addNotification(`LOW STOCK: ${productLabel} has only ${nextQty} left.`, 'warning', details);
    }
  };

  // --- EXISTING FUNCTIONALITY (WITH NOTIFICATION TRIGGERS) ---

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
    
    // Check stock if it's a carton being added (though usually addition doesn't trigger low stock, 
    // it's good to have it synced)
    if (saved.category === 'Carton') checkLowStock(saved, Number(saved.qty));
    
    return saved;
  };

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
      if (item.category === 'Carton' && field === 'qty') checkLowStock(item, 0);
    } else {
      const upd = await updateInventory(id, { [field]: next });
      setInventory(prev => prev.map(i => (i._id === id || i.id === id) ? { ...i, ...upd } : i));
      if (item.category === 'Carton' && field === 'qty') checkLowStock(item, next);
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
    
    if (next <= 0) {
      await deleteInventory(id);
      setInventory(prev => prev.filter(i => i._id !== id));
      checkLowStock(item, 0);
    } else {
      const upd = await updateInventory(id, { qty: next });
      setInventory(prev => prev.map(i => i._id === id ? { ...i, ...upd } : i));
      checkLowStock(item, next);
    }
  };

  const removeItem = async (id) => {
    await deleteInventory(id);
    setInventory(prev => prev.filter(i => i._id !== id));
  };

  return (
    <StockContext.Provider value={{
      inventory, 
      loading,
      notifications, // Notification Center support
      addRoll, 
      adjustStock,
      issueYards, 
      editItemYards,
      updateStock, 
      removeItem,
      dismissNotification, // Action to dismiss
      clearAllNotifications,
      refreshInventory, 
      setInventory,
    }}>
      {children}
    </StockContext.Provider>
  );
};
