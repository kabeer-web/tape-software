import { supabase } from './supabase';

export const getInventory = async () => {
  const { data, error } = await supabase
    .from('inventory').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map(row => ({ ...row, _id: row.id, rollNo: row.roll_no, cartonType: row.carton_type }));
};

export const getInventoryByRoll = async (rollNo) => {
  const trimmed = String(rollNo).trim();
  const { data, error } = await supabase.from('inventory').select('*').eq('roll_no', trimmed).maybeSingle();
  if (data) return { ...data, _id: data.id, rollNo: data.roll_no };
  return null;
};

export const addInventory = async (item) => {
  const payload = {
    category: item.category || null,
    type: item.type || item.category || null,
    date: item.date || null,
    roll_no: item.rollNo || item.roll_no || null,
    yards: item.yards ? Number(item.yards) : 0,
    micron: item.micron || null,
    width: item.width || null,
    color: item.color || null,
    brand: item.brand || null,
    side: item.side || null,
    ply: item.ply || null,
    qty: item.qty ? Number(item.qty) : 0,
    carton_type: item.cartonType || item.carton_type || null,
    size: item.size || null,
  };
  const { data, error } = await supabase.from('inventory').insert([payload]).select().single();
  if (error) throw new Error(error.message);
  return { ...data, _id: data.id, rollNo: data.roll_no, cartonType: data.carton_type };
};

// FIXED: Ab ye function har tarah ki update (qty, yards, etc.) accept karega
export const updateInventory = async (id, updates) => {
  const { data, error } = await supabase
    .from('inventory')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return { ...data, _id: data.id, rollNo: data.roll_no, cartonType: data.carton_type };
};

export const deleteInventory = async (id) => {
  const { error } = await supabase.from('inventory').delete().eq('id', id);
  if (error) throw new Error(error.message);
  return true;
};

// BILLS, PARTIES, PRODUCTIONS (Baaki functions same raheinge jo aapne diye thay)
export const getBills = async () => {
  const { data, error } = await supabase.from('bills').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map(b => ({ ...b, _id: b.id, billNo: b.bill_no, partyName: b.party_name, grandTotal: b.grand_total, billType: b.bill_type, totalCartonCount: b.total_carton_count, cartonUsed: b.carton_used }));
};

export const addBill = async (bill) => {
  const payload = { bill_type: bill.billType || 'Sale', bill_no: bill.billNo || '', party_name: bill.partyName || '', date: bill.date || '', grand_total: bill.grandTotal || 0, items: bill.items || [], total_carton_count: bill.totalCartonCount || 0, carton_used: bill.cartonUsed || null, logo: bill.logo || null };
  const { data, error } = await supabase.from('bills').insert([payload]).select().single();
  if (error) throw new Error(error.message);
  return { ...data, _id: data.id };
};

export const deleteBill = async (id) => {
  const { error } = await supabase.from('bills').delete().eq('id', id);
  if (error) throw new Error(error.message);
  return true;
};

export const getProductions = async () => {
  const { data, error } = await supabase.from('productions').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map(p => ({ ...p, _id: p.id }));
};

export const addProduction = async (prod) => {
  const { _id, id, created_at, ...rest } = prod;
  const { data, error } = await supabase.from('productions').insert([rest]).select().single();
  if (error) throw new Error(error.message);
  return { ...data, _id: data.id };
};
