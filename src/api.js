import { supabase } from './supabase';

/**
 * HELPER: Supabase 'id' ko frontend ke '_id' format mein convert karne ke liye
 */
const mapId = (data) => {
  if (!data) return null;
  if (Array.isArray(data)) {
    return data.map(item => ({ ...item, _id: item.id }));
  }
  return { ...data, _id: data.id };
};

/**
 * HELPER: Database (snake_case) se Frontend (camelCase) mapping
 */
const translateBill = (b) => {
  if (!b) return null;
  return {
    ...b,
    _id: b.id,
    billType: b.bill_type,
    billNo: b.bill_no,
    partyName: b.party_name,
    grandTotal: b.grand_total,
    totalCartonCount: b.total_carton_count,
    cartonUsed: b.carton_used,
    date: b.date,
    items: b.items,
    logo: b.logo
  };
};

// ─── INVENTORY API ───────────────────────────────────────
export const getInventory = async () => {
  const { data, error } = await supabase.from('inventory').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return mapId(data);
};

export const addInventory = async (item) => {
  const payload = {
    ...item,
    roll_no: item.rollNo || item.roll_no,
    date: item.date || new Date().toLocaleDateString('en-GB')
  };
  delete payload.rollNo; 
  delete payload._id;
  const { data, error } = await supabase.from('inventory').insert([payload]).select().single();
  if (error) throw new Error(error.message);
  return mapId(data);
};

export const updateInventory = async (id, updates) => {
  const { data, error } = await supabase.from('inventory').update(updates).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return mapId(data);
};

export const deleteInventory = async (id) => {
  const { error } = await supabase.from('inventory').delete().eq('id', id);
  if (error) throw new Error(error.message);
  return true;
};

// Backs the "Wipe DB" button in MasterSearch.jsx. Supabase requires a WHERE
// clause on delete — `.not('id','is',null)` matches every row since id is
// never null, i.e. this really does delete everything in the table.
export const deleteAllInventory = async () => {
  const { error } = await supabase.from('inventory').delete().not('id', 'is', null);
  if (error) throw new Error(error.message);
  return true;
};

export const getInventoryByRoll = async (rollNo) => {
  const raw = String(rollNo ?? '').trim();
  if (!raw) return null;

  // Exact match first — covers already-correct input and any non-numeric
  // legacy roll numbers.
  let { data, error } = await supabase.from('inventory').select('*').eq('roll_no', raw).maybeSingle();
  if (error) throw new Error(error.message);
  if (data) return mapId(data);

  if (!isNaN(raw)) {
    // 6-digit is the current auto-generated format (see
    // StockContext.jsx addRoll). 3/2-digit cover older rolls saved before
    // that format existed.
    for (const len of [6, 3, 2]) {
      const padded = raw.padStart(len, '0');
      if (padded === raw) continue;
      const res = await supabase.from('inventory').select('*').eq('roll_no', padded).maybeSingle();
      if (res.error) throw new Error(res.error.message);
      if (res.data) return mapId(res.data);
    }
  }
  return null;
};

// ─── BILLS API ───────────────────────────────────────────
export const getBills = async () => {
  const { data, error } = await supabase.from('bills').select('*').order('date', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map(translateBill);
};

export const addBill = async (billData) => {
  const payload = {
    bill_type: billData.billType,
    bill_no: billData.billNo,
    party_name: billData.partyName,
    date: billData.date,
    items: billData.items,
    grand_total: billData.grandTotal,
    total_carton_count: billData.totalCartonCount,
    carton_used: billData.cartonUsed,
    logo: billData.logo
  };
  const { data, error } = await supabase.from('bills').insert([payload]).select().single();
  if (error) throw new Error(error.message);
  return translateBill(data);
};

export const updateBill = async (id, updates) => {
  const payload = {
    bill_type: updates.billType,
    bill_no: updates.billNo,
    party_name: updates.partyName,
    date: updates.date,
    items: updates.items,
    grand_total: updates.grandTotal,
    total_carton_count: updates.totalCartonCount,
    carton_used: updates.cartonUsed,
    logo: updates.logo
  };
  const { data, error } = await supabase.from('bills').update(payload).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return translateBill(data);
};

export const deleteBill = async (id) => {
  const { error } = await supabase.from('bills').delete().eq('id', id);
  if (error) throw new Error(error.message);
  return true;
};

// ─── LEDGER API (FIXED: Added Update & Delete) ───────────
export const getLedgerEntries = async (partyName) => {
  let q = supabase.from('ledger_entries').select('*').order('date', { ascending: false });
  if (partyName) q = q.ilike('party_name', `%${partyName.trim()}%`);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return mapId(data);
};

export const addLedgerEntry = async (entry) => {
  const { data, error } = await supabase.from('ledger_entries').insert([entry]).select().single();
  if (error) throw new Error(error.message);
  return mapId(data);
};

export const updateLedgerEntry = async (id, updates) => {
  const { data, error } = await supabase.from('ledger_entries').update(updates).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return mapId(data);
};

export const deleteLedgerEntry = async (id) => {
  const { error } = await supabase.from('ledger_entries').delete().eq('id', id);
  if (error) throw new Error(error.message);
  return true;
};

// ─── PRODUCTIONS API (FIXED: Added Update) ────────────────
export const getProductions = async () => {
  const { data, error } = await supabase.from('productions').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return mapId(data);
};

export const addProduction = async (prodData) => {
  const { data, error } = await supabase.from('productions').insert([prodData]).select().single();
  if (error) throw new Error(error.message);
  return mapId(data);
};

export const updateProduction = async (id, updates) => {
  const { data, error } = await supabase.from('productions').update(updates).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return mapId(data);
};

export const deleteProduction = async (id) => {
  const { error } = await supabase.from('productions').delete().eq('id', id);
  if (error) throw new Error(error.message);
  return true;
};

// ─── ACTIVITY LOG API (History page) ──────────────────────
// Backs the History page (src/Components/Analytics.jsx — filename kept as
// Analytics on purpose, only the sidebar label + in-page heading changed to
// "History"). Needs a Supabase table called `activity_log` — see the SQL
// migration handed over alongside this file; run it once in the Supabase
// SQL editor before this will work.
export const getActivityLog = async () => {
  const { data, error } = await supabase.from('activity_log').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return mapId(data);
};

// Fire-and-forget on purpose: recording history should never be able to
// break the actual action it's describing (adding a roll, saving a bill...).
// If the insert fails — e.g. the migration hasn't been run yet — this logs
// to console and swallows the error instead of throwing.
export const logActivity = async (entry) => {
  try {
    const payload = {
      action: entry.action,           // 'add' | 'edit' | 'delete'
      entity: entry.entity,           // 'Jambo' | 'Core' | 'Carton' | 'Production' | 'Bill'
      category: entry.category || null,
      label: entry.label,
      detail: entry.detail || null,
      party_name: entry.partyName || null,
      amount: entry.amount ?? null,
    };
    const { error } = await supabase.from('activity_log').insert([payload]);
    if (error) console.error('logActivity failed (History entry not saved):', error.message);
  } catch (e) {
    console.error('logActivity failed (History entry not saved):', e);
  }
};

// The "editable" part of History — lets you correct/annotate a past entry's
// note without touching what actually happened.
export const updateActivityLogNote = async (id, note) => {
  const { data, error } = await supabase.from('activity_log').update({ note }).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return mapId(data);
};

export const deleteActivityLog = async (id) => {
  const { error } = await supabase.from('activity_log').delete().eq('id', id);
  if (error) throw new Error(error.message);
  return true;
};