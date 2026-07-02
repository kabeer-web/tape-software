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

export const getInventoryByRoll = async (rollNo) => {
  let { data, error } = await supabase.from('inventory').select('*').ilike('roll_no', rollNo).maybeSingle();
  if (!data && !isNaN(rollNo)) {
    const padded = rollNo.padStart(3, '0');
    const res = await supabase.from('inventory').select('*').eq('roll_no', padded).maybeSingle();
    data = res.data;
  }
  if (error) throw new Error(error.message);
  return mapId(data);
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
    grand_total: updates.grandTotal
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
