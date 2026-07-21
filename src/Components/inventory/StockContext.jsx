import { createContext, useState, useEffect, useCallback, useContext, useRef } from 'react';
import { getInventory, addInventory, updateInventory, deleteInventory, deleteAllInventory, logActivity, getBrands, addBrand, updateBrand, deleteBrand, getSpecOptions, addSpecOption, deleteSpecOption } from '../../api';
import { supabase } from '../../supabase';

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

// Exact match only — searching "1" should find ONLY roll #1, not every
// roll whose number happens to contain a "1" (10, 11, 12, 21...). That
// substring behavior was the previous implementation and made search
// unusable once there were more than a handful of rolls.
export const rollMatches = (rollNo, query) => {
  const q = String(query ?? '').trim();
  if (!q) return true;
  return displayRoll(rollNo) === q || String(rollNo ?? '') === q;
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

  // ── Brands (Core/Carton) ────────────────────────────────
  // A real `brands` table now, not a hardcoded list baked into a separate
  // file per brand — see 003_brands.sql. New brands can be added from the
  // UI (addBrandManual below) or auto-register themselves the moment
  // they're used (see upsertStock further down), so a new brand never
  // needs a code change.
  const [brands, setBrands] = useState([]);
  const brandsRef = useRef([]);
  const setBrandsBoth = (updater) => {
    setBrands(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      brandsRef.current = next;
      return next;
    });
  };

  useEffect(() => {
    getBrands().then(setBrandsBoth).catch(console.error);
  }, []);

  useEffect(() => {
    // Unique channel name per mount — avoids the "already subscribed" crash
    // if this effect ever runs twice (React StrictMode in dev, etc.).
    const channelName = `brands_live_${Math.random().toString(36).slice(2)}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'brands' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const row = { ...payload.new, _id: payload.new.id };
          setBrandsBoth(prev => prev.some(b => b._id === row._id) ? prev : [...prev, row].sort((a,b)=>a.name.localeCompare(b.name)));
        } else if (payload.eventType === 'DELETE') {
          setBrandsBoth(prev => prev.filter(b => b._id !== payload.old.id));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Manual "+ Add Brand" from the UI.
  const addBrandManual = async (name) => {
    const clean = name.trim();
    if (!clean) return;
    if (brandsRef.current.some(b => b.name.toLowerCase() === clean.toLowerCase())) return;
    const saved = await addBrand(clean);
    setBrandsBoth(prev => [...prev, saved].sort((a,b)=>a.name.localeCompare(b.name)));
    return saved;
  };

  const deleteBrandManual = async (id) => {
    await deleteBrand(id);
    setBrandsBoth(prev => prev.filter(b => b._id !== id));
  };

  // Renaming updates the brand record AND every inventory row currently
  // using the old name (Core + Carton), so existing stock stays correctly
  // linked to the brand instead of silently becoming "orphaned" under a
  // name that no longer appears anywhere in the brand list.
  const renameBrandManual = async (brandObj, newName) => {
    const clean = newName.trim();
    if (!clean || clean === brandObj.name) return;
    const updated = await updateBrand(brandObj._id, clean);
    setBrandsBoth(prev => prev.map(b => b._id === brandObj._id ? updated : b).sort((a,b)=>a.name.localeCompare(b.name)));

    const affected = inventoryRef.current.filter(i => i.brand === brandObj.name);
    for (const item of affected) {
      await updateInventory(item._id || item.id, { brand: clean });
    }
    setInventory(prev => prev.map(i => i.brand === brandObj.name ? { ...i, brand: clean } : i));
    return updated;
  };

  // Silently registers a brand the first time it's used (e.g. a Purchase
  // bill line for a brand that doesn't exist yet) — this is what makes "add
  // a new brand" not require going into the code at all. Never throws; a
  // failure here shouldn't block the actual stock save.
  const ensureBrandExists = async (name) => {
    if (!name) return;
    const clean = String(name).trim();
    if (!clean) return;
    if (brandsRef.current.some(b => b.name.toLowerCase() === clean.toLowerCase())) return;
    try {
      const saved = await addBrand(clean);
      setBrandsBoth(prev => prev.some(b => b._id === saved._id) ? prev : [...prev, saved].sort((a,b)=>a.name.localeCompare(b.name)));
    } catch (e) {
      console.warn('ensureBrandExists failed (non-fatal):', e.message);
    }
  };

  // ── Spec options (Ply, Carton Size) ─────────────────────
  // Was 7 hardcoded arrays scattered across CoreManager, CartonManager,
  // Production, PurchaseInvoice, SaleInvoice, CartonStock — one table now
  // (see 004_spec_options.sql), managed from the Sidebar.
  const [specOptions, setSpecOptions] = useState([]);
  useEffect(() => {
    getSpecOptions().then(setSpecOptions).catch(console.error);
  }, []);

  useEffect(() => {
    const channelName = `spec_options_live_${Math.random().toString(36).slice(2)}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'spec_options' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const row = { ...payload.new, _id: payload.new.id };
          setSpecOptions(prev => prev.some(o => o._id === row._id) ? prev : [...prev, row]);
        } else if (payload.eventType === 'DELETE') {
          setSpecOptions(prev => prev.filter(o => o._id !== payload.old.id));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const plyOptions       = specOptions.filter(o => o.type === 'ply').map(o => o.value).sort((a,b)=>Number(a)-Number(b));
  const cartonSizeOptions = specOptions.filter(o => o.type === 'carton_size').map(o => o.value).sort((a,b)=>Number(a)-Number(b));

  const addSpecOptionManual = async (type, value) => {
    const clean = String(value).trim();
    if (!clean) return;
    if (specOptions.some(o => o.type === type && o.value === clean)) return;
    const saved = await addSpecOption(type, clean);
    setSpecOptions(prev => [...prev, saved]);
    return saved;
  };

  const deleteSpecOptionManual = async (id) => {
    await deleteSpecOption(id);
    setSpecOptions(prev => prev.filter(o => o._id !== id));
  };

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
        logActivity({
          action: 'add',
          entity: isJambo ? 'Jambo' : (category === 'Core' ? 'Core' : category === 'Carton' ? 'Carton' : category),
          category,
          label: isJambo
            ? `Roll #${displayRoll(saved.roll_no)} added — ${category}, ${saved.micron}μ, ${saved.width}mm, ${saved.yards} yards`
            : `${category} added — ${saved.brand || ''} ${saved.qty ?? saved.yards ?? ''}`.trim(),
        });
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
    if (matchFields.brand && amount > 0) ensureBrandExists(matchFields.brand); // fire-and-forget, non-blocking
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
      logActivity({
        action: delta > 0 ? 'add' : 'edit',
        entity: item.category || 'Stock',
        category: item.category,
        label: `${item.category || 'Stock'} — ${item.brand || ''} ${delta > 0 ? '+' : ''}${delta} (now ${newVal})`.trim(),
      });
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
    const item = inventoryRef.current.find(i => i._id === id || i.id === id);
    try {
      await deleteInventory(id);
      setInventory(prev => prev.filter(i => i._id !== id && i.id !== id));
      if (item) {
        const isJambo = JAMBO_CATS.includes(item.category);
        logActivity({
          action: 'delete',
          entity: isJambo ? 'Jambo' : (item.category || 'Stock'),
          category: item.category,
          label: isJambo
            ? `Roll #${displayRoll(item.rollNo || item.roll_no)} deleted — ${item.category}, ${item.micron}μ, ${item.width}mm, ${item.yards} yards`
            : `${item.category || 'Stock'} deleted — ${item.brand || ''} ${item.qty ?? ''}`.trim(),
        });
      }
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
  // Negative values ARE allowed on purpose — if production overdrew a roll,
  // the shortfall should be visible as e.g. "-5", not silently floored to 0.
  const editItemYards = async (id, value) => {
    const item = inventoryRef.current.find(i => i._id === id || i.id === id);
    if (!item) return;
    const v = Number(value);
    if (isNaN(v)) return;
    const newVal = parseFloat(v.toFixed(4));
    try {
      const updated = await updateInventory(item._id || item.id, { yards: newVal });
      setInventory(prev => prev.map(i => (i._id === id || i.id === id) ? updated : i));
    } catch (e) { console.error(e); alert("Update failed"); }
  };

  // ✅ Full-row edit for a Jambo roll — roll number, micron, width, color,
  // weight, yards — whatever fields are passed in `updates`. This is what
  // lets a roll be corrected end-to-end (including a manual roll-no fix),
  // not just its yards. `rollNo` (camelCase) is translated to the DB's
  // `roll_no` column. Yards is allowed to be negative (see editItemYards).
  // Roll-number uniqueness is enforced by the DB (see
  // migrations/002_inventory_roll_no_unique.sql) — a duplicate throws and
  // the caller should show that message to the user.
  const editItem = async (id, updates) => {
    const item = inventoryRef.current.find(i => i._id === id || i.id === id);
    if (!item) return;
    const payload = { ...updates };
    if (payload.rollNo !== undefined) {
      payload.roll_no = String(payload.rollNo).trim();
      delete payload.rollNo;
    }
    if (payload.yards !== undefined) {
      const v = Number(payload.yards);
      if (isNaN(v)) delete payload.yards;
      else payload.yards = parseFloat(v.toFixed(4));
    }
    const updated = await updateInventory(item._id || item.id, payload);
    setInventory(prev => prev.map(i => (i._id === id || i.id === id) ? updated : i));
    const isJambo = JAMBO_CATS.includes(item.category);
    logActivity({
      action: 'edit',
      entity: isJambo ? 'Jambo' : (item.category || 'Stock'),
      category: item.category,
      label: isJambo
        ? `Roll #${displayRoll(updated.roll_no)} edited — ${item.category}`
        : `${item.category || 'Stock'} edited — ${updated.brand || ''}`.trim(),
    });
    return updated;
  };

  // Deliberately no floor here — a Jambo roll's yards (or any field this is
  // used on) can go negative, e.g. if Production draws more than is left.
  // That should show up as a visible negative number so the mistake gets
  // caught, instead of being silently clamped to 0 and hidden.
  const adjustStock = async (item, field, delta) => {
    const id = item._id || item.id;
    const currentVal = Number(item[field]) || 0;
    const newVal = parseFloat((currentVal + delta).toFixed(4));
    try {
      const updated = await updateInventory(id, { [field]: newVal });
      setInventory(prev => prev.map(i => (i._id === id) ? updated : i));
    } catch (e) { console.error(e); }
  };

  return (
    <StockContext.Provider value={{
      inventory, loading, refreshInventory,
      adjustStock, addRoll, updateStock, removeItem, setInventory,
      issueYards, editItemYards, editItem, upsertStock, resetInventory,
      brands, addBrandManual, renameBrandManual, deleteBrandManual,
      plyOptions, cartonSizeOptions, specOptions, addSpecOptionManual, deleteSpecOptionManual
    }}>
      {children}
    </StockContext.Provider>
  );
};
