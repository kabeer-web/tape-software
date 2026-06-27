import { supabase } from './supabase';

// ─── INVENTORY ──────────────────────────────────────────
export const getInventory = async () => {
  const { data, error } = await supabase
    .from('inventory')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map(row => ({
    ...row,
    _id: row.id,
    rollNo: row.roll_no,
    cartonType: row.carton_type,
  }));
};

export const getInventoryByRoll = async (rollNo) => {
  const trimmed = String(rollNo).trim();
  const { data, error } = await supabase
    .from('inventory')
    .select('*')
    .eq('roll_no', trimmed)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? { ...data, _id: data.id, rollNo: data.roll_no } : null;
};

export const addInventory = async (item) => {
  const { data, error } = await supabase
    .from('inventory').insert([item]).select().single();
  if (error) throw new Error(error.message);
  return { ...data, _id: data.id };
};

export const updateInventory = async (id, updates) => {
  const { data, error } = await supabase
    .from('inventory').update(updates).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return { ...data, _id: data.id };
};

export const deleteInventory = async (id) => {
  const { error } = await supabase.from('inventory').delete().eq('id', id);
  if (error) throw new Error(error.message);
  return true;
};

// ─── BILLS ──────────────────────────────────────────────
export const getBills = async () => {
  const { data, error } = await supabase
    .from('bills').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map(b => ({
    ...b,
    _id: b.id,
    billNo: b.bill_no,
    partyName: b.party_name,
  }));
};

export const addBill = async (bill) => {
  const { data, error } = await supabase.from('bills').insert([bill]).select().single();
  if (error) throw new Error(error.message);
  return data;
};

// --- YE FUNCTION MISSING THA ---
export const updateBill = async (id, bill) => {
  const { data, error } = await supabase
    .from('bills').update(bill).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return data;
};

export const deleteBill = async (id) => {
  const { error } = await supabase.from('bills').delete().eq('id', id);
  if (error) throw new Error(error.message);
  return true;
};

// ─── PARTIES ────────────────────────────────────────────
export const getParties = async () => {
  const { data, error } = await supabase.from('parties').select('*').order('name', { ascending: true });
  if (error) throw new Error(error.message);
  return (data || []).map(p => ({ ...p, _id: p.id }));
};

export const addParty = async (party) => {
  const { data, error } = await supabase.from('parties').insert([party]).select().single();
  if (error) throw new Error(error.message);
  return { ...data, _id: data.id };
};

export const updateParty = async (id, updates) => {
  const { data, error } = await supabase.from('parties').update(updates).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return { ...data, _id: data.id };
};

export const deleteParty = async (id) => {
  const { error } = await supabase.from('parties').delete().eq('id', id);
  if (error) throw new Error(error.message);
  return true;
};

// ─── PRODUCTIONS ────────────────────────────────────────
export const getProductions = async () => {
  const { data, error } = await supabase.from('productions').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map(p => ({ ...p, _id: p.id }));
};

export const addProduction = async (prod) => {
  const { data, error } = await supabase.from('productions').insert([prod]).select().single();
  if (error) throw new Error(error.message);
  return { ...data, _id: data.id };
};

// --- YE FUNCTIONS MISSING THAY ---
export const updateProduction = async (id, prod) => {
  const { data, error } = await supabase
    .from('productions').update(prod).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return { ...data, _id: data.id };
};

export const deleteProduction = async (id) => {
  const { error } = await supabase.from('productions').delete().eq('id', id);
  if (error) throw new Error(error.message);
  return true;
};
