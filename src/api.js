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

// ─── INVENTORY / STOCK API ────────────────────────────────
export const getInventory = async () => {
  const { data, error } = await supabase
    .from('inventory')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return mapId(data);
};

export const addInventory = async (item) => {
  // Frontend se 'rollNo' aata hai, DB mein 'roll_no' ho sakta hai
  const payload = {
    ...item,
    roll_no: item.rollNo || item.roll_no,
    date: item.date || new Date().toLocaleDateString('en-GB')
  };
  // Duplicate fields remove karna takay Supabase error na de
  delete payload.rollNo; 
  delete payload._id;

  const { data, error } = await supabase
    .from('inventory')
    .insert([payload])
    .select()
    .single();
  if (error) throw new Error(error.message);
  return mapId(data);
};

export const updateInventory = async (id, updates) => {
  const { data, error } = await supabase
    .from('inventory')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return mapId(data);
};

export const deleteInventory = async (id) => {
  const { error } = await supabase
    .from('inventory')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
  return true;
};

export const getInventoryByRoll = async (rollNo) => {
  const { data, error } = await supabase
    .from('inventory')
    .select('*')
    .eq('roll_no', rollNo)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return mapId(data);
};

// HS Stock Sync Logic
export const syncHSStock = async (item, multiplier) => {
  const { data: records } = await supabase
    .from('inventory')
    .select('*')
    .eq('brand', item.brand)
    .eq('carton_type', item.cartonType)
    .eq('size', item.size);

  if (records && records.length > 0) {
    const target = records[0];
    const perCtn = Number(target.qty_per_carton || target.per_ctn || item.perCtn || 1);
    const cartonChange = Number(item.cartons) * multiplier;
    const qtyChange = (Number(item.cartons) * perCtn) * multiplier;

    const { error } = await supabase.from('inventory').update({
      cartons: Math.max(0, (Number(target.cartons) || 0) + cartonChange),
      qty: Math.max(0, (Number(target.qty) || 0) + qtyChange)
    }).eq('id', target.id);

    if (error) throw new Error(error.message);
    return true;
  }
  return false;
};

// ─── BILLS / ACCOUNTS API ────────────────────────────────
export const getBills = async () => {
  const { data, error } = await supabase
    .from('bills')
    .select('*')
    .order('date', { ascending: false });
  if (error) throw new Error(error.message);
  return mapId(data);
};

export const addBill = async (billData) => {
  const { data, error } = await supabase
    .from('bills')
    .insert([billData])
    .select()
    .single();
  if (error) throw new Error(error.message);
  return mapId(data);
};

export const updateBill = async (id, updates) => {
  const { data, error } = await supabase
    .from('bills')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return mapId(data);
};

export const deleteBill = async (id) => {
  const { error } = await supabase
    .from('bills')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
  return true;
};

// ─── LEDGER API ──────────────────────────────────────────
export const getLedgerEntries = async (partyName) => {
  let q = supabase.from('ledger_entries').select('*').order('date', { ascending: false });
  if (partyName) q = q.ilike('party_name', `%${partyName.trim()}%`);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return mapId(data);
};

export const addLedgerEntry = async (entry) => {
  const { data, error } = await supabase
    .from('ledger_entries')
    .insert([entry])
    .select()
    .single();
  if (error) throw new Error(error.message);
  return mapId(data);
};

export const updateLedgerEntry = async (id, updates) => {
  const { data, error } = await supabase
    .from('ledger_entries')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return mapId(data);
};

export const deleteLedgerEntry = async (id) => {
  const { error } = await supabase
    .from('ledger_entries')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
  return true;
};

// ─── PRODUCTIONS API ─────────────────────────────────────
export const getProductions = async () => {
  const { data, error } = await supabase
    .from('productions')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return mapId(data);
};

export const addProduction = async (prodData) => {
  const { data, error } = await supabase
    .from('productions')
    .insert([prodData])
    .select()
    .single();
  if (error) throw new Error(error.message);
  return mapId(data);
};

export const updateProduction = async (id, updates) => {
  const { data, error } = await supabase
    .from('productions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return mapId(data);
};

export const deleteProduction = async (id) => {
  const { error } = await supabase
    .from('productions')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
  return true;
};
