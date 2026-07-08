import { createContext, useState, useEffect, useCallback, useContext, useRef } from 'react';
import { getInventory, addInventory, updateInventory, deleteInventory, deleteAllInventory } from '../../api';

// Display/search helpers — exported here (not a separate file) since every
// place that needs them already imports from StockContext anyway.
// Roll numbers are stored as plain numbers now ("1","2",...), but rows saved
// before this change may still be zero-padded ("000005") — these helpers
// normalize either format so old and new rolls behave identically.
export const displayRoll = (rollNo) => {
  const s = String(rollNo ?? '').trim();
  if (!s) return '';
  const n = parseInt(s, 10);
  return isNaN(n) ? s : String(n);
};

export const rollMatches = (rollNo, query) => {
  const q = String(query ?? '').trim();
  if (!q) return true;
  const raw = String(rollNo ?? '');
  return displayRoll(rollNo).includes(q) || raw.includes(q);
};

export const StockContext = createContext();
export const useStock = () => useContext(StockContext);

const JAMBO_CATS = ['Clear','Tan','Cloth','Masking','Tissue','SuperYellow','SuperClear','Color','Foam','Lemon'];

// Postgres unique_violation error code (see migrations/002_inventory_roll_no_unique.sql)
const UNIQUE_VIOLATION = '23505';

// Roll numbers are sequential, no gaps, no duplicates, and only apply to
// Jambo-category rolls — Core/Carton stock is qty-based and never gets a
// roll number. Stored as plain numbers ("1", "2", ...), not zero-padded —
// displayRoll()/rollMatches() above handle any older rows that were saved
// zero-padded before this.
const nextRollNo = (currentInventory) => {
  const nums = currentInventory
    .map(i => parseInt(i.rollNo || i.roll_no, 10))
    .filter(n => !isNaN(n) && n > 0);
  const max = nums.length ? Math.max(...nums) : 0;
  return String(max + 1);
};

export const StockProvider = ({ children }) => {
  const [inventory, setInventoryState] = useState([]); // Array guarantee
  const [loading, setLoading] = useState(true);

  // Mirrors `inventory` but updates SYNCHRONOUSLY, unlike React state.
  // Needed because Purchase/Production save multiple rolls in a sequential
  // loop (await addRoll() in a for-loop) — if roll-number generation reads
  // React state, two lines saved in the same loop can both compute the same
  // "next" number before either render has flushed. Reading this ref instead
  // guarantees every call in the same batch sees the truly latest data.
  const inventoryRef = useRef([]);

  const setInventory = useCallback((updater) => {
    setInventoryState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      inventoryRef.current = next;
      return next;
    });
  }, []);

  const refreshInventory = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getInventory();
      const safe = data || [];
      setInventory(safe);
      return safe;
    } catch (e) {
      console.error(e);
      return inventoryRef.current;
    } finally {
      setLoading(false);
    }
  }, [setInventory]);

  useEffect(() => { refreshInventory(); }, [refreshInventory]);

  // ✅ Add roll/item. Auto-generates a sequential roll number for Jambo
  // categories only. Retries on a rare concurrent-duplicate collision
  // (two people — or two lines in the same bill — saving at the same
  // moment) — see migrations/002_inventory_roll_no_unique.sql for the
  // DB-side uniqueness guarantee this relies on as a last resort.
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
    let currentInv = inventoryRef.current;
    let lastErr;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      try {
        const payload = buildPayload(currentInv);
        const saved = await addInventory(payload);
        setInventory(prev => [saved, ...prev]); // updates state AND inventoryRef synchronously
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
        currentInv = await refreshInventory();
      }
    }
    console.error("Add Error:", lastErr);
    throw lastErr;
  };

  // ✅ Add-or-merge qty stock (Core/Carton brand pages + Purchase invoice
  // lines). If a row already matches every field in `matchFields` it's
  // topped up instead of creating a duplicate row — enforces "no duplicate
  // stock" for qty-based inventory. Reads inventoryRef so it's correct even
  // when called repeatedly in the same save loop (e.g. a purchase bill with
  // two Core lines of the same brand/side/ply).
  //
  // `delta` can be negative — this is also how Saved Bills reverses a
  // Purchase line on edit/delete (e.g. delta = -qty to undo it, or
  // newQty - oldQty to apply an edit). A negative delta with no existing
  // matching row means there's nothing to reverse; that's logged and
  // skipped rather than thrown, since it can legitimately happen for bills
  // saved before this linkage existed.
  const upsertStock = async (matchFields, delta, extraFields = {}) => {
    const amount = Number(delta) || 0;
    if (amount === 0) return;
    const existing = inventoryRef.current.find(i =>
      Object.entries(matchFields).every(([k, v]) => String(i[k] ?? '') === String(v ?? ''))
    );
    if (existing) {
      return updateStock(existing._id || existing.id, amount);
    }
    if (amount > 0) {
      return addRoll({ ...matchFields, ...extraFields, qty: amount });
    }
    console.warn('upsertStock: no matching row to reverse against', matchFields, amount);
  };

  // ✅ Direct Update (Used by Core/Carton brand pages — qty field)
  const updateStock = async (id, delta) => {
    const item = inventoryRef.current.find(i => i._id === id || i.id === id);
    if (!item) return;
    const newVal = Math.max(0, (Number(item.qty) || 0) + delta);
    try {
      const updated = await updateInventory(item._id || item.id, { qty: newVal });
      setInventory(prev => prev.map(i => (i._id === id || i.id === id) ? updated : i));
      return updated;
    } catch (e) { console.error(e); alert("Update failed"); }
  };

  // ✅ Wipe every inventory row — backs MasterSearch.jsx's "Wipe DB" button.
  // Deliberately destructive with no partial/undo path, so callers should
  // make sure the confirmation step is strong before calling this.
  const resetInventory = async () => {
    try {
      await deleteAllInventory();
      setInventory([]);
    } catch (e) {
      console.error(e);
      alert('Reset failed: ' + e.message);
    }
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
    const item = inventoryRef.current.find(i => i._id === id || i.id === id);
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
    const item = inventoryRef.current.find(i => i._id === id || i.id === id);
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
      issueYards, editItemYards, upsertStock, resetInventory
    }}>
      {children}
    </StockContext.Provider>
  );
};