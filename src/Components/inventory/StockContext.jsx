import { createContext, useState, useEffect, useCallback, useContext } from 'react';
import { getInventory, addInventory, updateInventory, deleteInventory } from '../../api';

export const StockContext = createContext();
export const useStock = () => useContext(StockContext);

const JAMBO_CATS = ['Clear','Tan','Cloth','Masking','Tissue','SuperYellow','SuperClear','Color','Foam'];

// Postgres unique_violation error code (see migrations/002_inventory_roll_no_unique.sql)
const UNIQUE_VIOLATION = '23505';

// Roll numbers are sequential per your spec (000001, 000002, ...), no gaps,
// no duplicates, and only apply to Jambo-category rolls — Core/Carton stock
// is qty-based and never gets a roll number.
const nextRollNo = (currentInventory) => {
  const nums = currentInventory
    .map(i => parseInt(i.rollNo || i.roll_no, 10))
    .filter(n => !isNaN(n) && n > 0);
  const max = nums.length ? Math.max(...nums) : 0;
  return String(max + 1).padStart(6, '0');
};

export const StockProvider = ({ children }) => {
  const [inventory, setInventory] = useState([]); // Array guarantee
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

  // ✅ Add roll/item. Auto-generates a sequential roll number for Jambo
  // categories only. Retries on a rare concurrent-duplicate collision
  // (two people saving at the exact same moment) — see migrations/
  // 002_inventory_roll_no_unique.sql for the DB-side uniqueness guarantee
  // this relies on.
  const addRoll = async (item) => {
    const category = item.category || 'Jambo';
    const isJambo = JAMBO_CATS.includes(category);

    const buildPayload = (currentInv) => {
      const payload = {
        ...item,
        category,
        date: item.date || new Date().toLocaleDateString('en-GB'),
      };
      if (isJambo && !payload.rollNo && !payload.roll_no) {
        payload.rollNo = nextRollNo(currentInv);
      }
      return payload;
    };

    const MAX_ATTEMPTS = 3;
    let lastErr;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      try {
        const payload = buildPayload(inventory);
        const saved = await addInventory(payload);
        setInventory(prev => [saved, ...prev]);
        return saved;
      } catch (e) {
        lastErr = e;
        const isDuplicateRollNo = isJambo && (
          e?.code === UNIQUE_VIOLATION ||
          /duplicate key/i.test(e?.message || '')
        );
        if (!isDuplicateRollNo) break; // real error, don't retry
        // Someone else took this roll number between our read and write —
        // refresh from the DB and try the next number.
        await refreshInventory();
      }
    }
    console.error("Add Error:", lastErr);
    throw lastErr;
  };

  // ✅ Add-or-merge qty stock (Core/Carton brand pages). If a row already
  // matches every field in `matchFields` it's topped up instead of creating
  // a duplicate row — enforces "no duplicate stock" for qty-based inventory.
  const upsertStock = async (matchFields, qty, extraFields = {}) => {
    const amount = Number(qty) || 0;
    if (amount <= 0) return;
    const existing = inventory.find(i =>
      Object.entries(matchFields).every(([k, v]) => String(i[k] ?? '') === String(v ?? ''))
    );
    if (existing) {
      return updateStock(existing._id || existing.id, amount);
    }
    return addRoll({ ...matchFields, ...extraFields, qty: amount });
  };

  // ✅ Direct Update (Used by Core/Carton brand pages — qty field)
  const updateStock = async (id, delta) => {
    const item = inventory.find(i => i._id === id || i.id === id);
    if (!item) return;
    const newVal = Math.max(0, (Number(item.qty) || 0) + delta);
    try {
      const updated = await updateInventory(item._id || item.id, { qty: newVal });
      setInventory(prev => prev.map(i => (i._id === id || i.id === id) ? updated : i));
    } catch (e) { console.error(e); alert("Update failed"); }
  };

  // ✅ Remove Item
  const removeItem = async (id) => {
    try {
      await deleteInventory(id);
      setInventory(prev => prev.filter(i => i._id !== id && i.id !== id));
    } catch (e) { console.error(e); alert("Delete failed"); }
  };

  // ✅ Issue yards from a Jambo roll (e.g. partial usage outside Production).
  // Never lets yards go negative.
  const issueYards = async (id, qty) => {
    const item = inventory.find(i => i._id === id || i.id === id);
    if (!item) return;
    const delta = Number(qty) || 0;
    if (delta <= 0) return;
    const newVal = Math.max(0, parseFloat(((Number(item.yards) || 0) - delta).toFixed(4)));
    try {
      const updated = await updateInventory(item._id || item.id, { yards: newVal });
      setInventory(prev => prev.map(i => (i._id === id || i.id === id) ? updated : i));
    } catch (e) { console.error(e); alert("Issue failed"); }
  };

  // ✅ Inline-edit a roll's yards to an exact value (correction, not a delta).
  const editItemYards = async (id, value) => {
    const item = inventory.find(i => i._id === id || i.id === id);
    if (!item) return;
    const v = Number(value);
    if (isNaN(v) || v < 0) return;
    const newVal = parseFloat(v.toFixed(4));
    try {
      const updated = await updateInventory(item._id || item.id, { yards: newVal });
      setInventory(prev => prev.map(i => (i._id === id || i.id === id) ? updated : i));
    } catch (e) { console.error(e); alert("Update failed"); }
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
      adjustStock, addRoll, updateStock, removeItem, setInventory,
      issueYards, editItemYards, upsertStock
    }}>
      {children}
    </StockContext.Provider>
  );
};
