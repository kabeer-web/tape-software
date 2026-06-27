import { supabase } from './supabase';

// ═══════════════════════════════════════════════
// INVENTORY
// ═══════════════════════════════════════════════

export const getInventory = async () => {
  const { data, error } = await supabase
    .from('inventory')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map(row => ({
    ...row,
    _id:        row.id,
    rollNo:     row.roll_no,
    cartonType: row.carton_type,
  }));
};

// Roll number se seedha Supabase se fetch (Production ke liye)
export const getInventoryByRoll = async (rollNo) => {
  const trimmed = String(rollNo).trim();

  // Try exact match
  const { data: exact } = await supabase
    .from('inventory')
    .select('*')
    .eq('roll_no', trimmed)
    .maybeSingle();

  if (exact) return { ...exact, _id: exact.id, rollNo: exact.roll_no };

  // Try padded (1 → 001)
  const padded = trimmed.padStart(3, '0');
  const { data: pad } = await supabase
    .from('inventory')
    .select('*')
    .eq('roll_no', padded)
    .maybeSingle();

  if (pad) return { ...pad, _id: pad.id, rollNo: pad.roll_no };

  // Try without leading zeros
  const stripped = trimmed.replace(/^0+/, '') || '0';
  const { data: all } = await supabase
    .from('inventory')
    .select('*')
    .not('category', 'in', '("Core","Carton")');

  const found = (all || []).find(i => {
    const rn = String(i.roll_no || '').replace(/^0+/, '') || '0';
    return rn === stripped;
  });

  if (found) return { ...found, _id: found.id, rollNo: found.roll_no };
  return null;
};

export const addInventory = async (item) => {
  const payload = {
    category:    item.category    || null,
    type:        item.type        || item.category || null,
    date:        item.date        || null,
    roll_no:     item.rollNo      || item.roll_no  || null,
    yards:       item.yards       ? Number(item.yards) : 0,
    micron:      item.micron      || null,
    width:       item.width       || null,
    color:       item.color       || null,
    brand:       item.brand       || null,
    side:        item.side        || null,
    ply:         item.ply         || null,
    qty:         item.qty         ? Number(item.qty) : 0,
    carton_type: item.cartonType  || item.carton_type || null,
    size:        item.size        || null,
  };
  const { data, error } = await supabase
    .from('inventory').insert([payload]).select().single();
  if (error) throw new Error(error.message);
  return { ...data, _id: data.id, rollNo: data.roll_no, cartonType: data.carton_type };
};

export const updateInventory = async (id, updates) => {
  const allowed = {};
  if (updates.yards  !== undefined) allowed.yards  = Number(updates.yards);
  if (updates.qty    !== undefined) allowed.qty    = Number(updates.qty);
  if (updates.color  !== undefined) allowed.color  = updates.color;
  if (updates.micron !== undefined) allowed.micron = updates.micron;
  if (updates.width  !== undefined) allowed.width  = updates.width;

  const { data, error } = await supabase
    .from('inventory').update(allowed).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return { ...data, _id: data.id, rollNo: data.roll_no, cartonType: data.carton_type };
};

export const deleteInventory = async (id) => {
  const { error } = await supabase.from('inventory').delete().eq('id', id);
  if (error) throw new Error(error.message);
  return true;
};

// ═══════════════════════════════════════════════
// BILLS
// ═══════════════════════════════════════════════

export const getBills = async () => {
  const { data, error } = await supabase
    .from('bills').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map(b => ({
    ...b,
    _id:              b.id,
    billNo:           b.bill_no,
    partyName:        b.party_name,
    grandTotal:       b.grand_total,
    billType:         b.bill_type,
    totalCartonCount: b.total_carton_count,
    cartonUsed:       b.carton_used,
  }));
};

export const addBill = async (bill) => {
  const payload = {
    bill_type:          bill.billType         || 'Sale',
    bill_no:            bill.billNo           || '',
    party_name:         bill.partyName        || '',
    date:               bill.date             || '',
    grand_total:        bill.grandTotal       || 0,
    items:              bill.items            || [],
    total_carton_count: bill.totalCartonCount || 0,
    carton_used:        bill.cartonUsed       || null,
    logo:               bill.logo             || null,
  };
  const { data, error } = await supabase
    .from('bills').insert([payload]).select().single();
  if (error) throw new Error(error.message);
  return {
    ...data,
    _id:              data.id,
    billNo:           data.bill_no,
    partyName:        data.party_name,
    grandTotal:       data.grand_total,
    billType:         data.bill_type,
    totalCartonCount: data.total_carton_count,
  };
};

export const updateBill = async (id, bill) => {
  const payload = {
    bill_no:            bill.billNo,
    party_name:         bill.partyName,
    date:               bill.date,
    grand_total:        bill.grandTotal       || 0,
    items:              bill.items            || [],
    total_carton_count: bill.totalCartonCount || 0,
  };
  const { data, error } = await supabase
    .from('bills').update(payload).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return {
    ...data,
    _id:              data.id,
    billNo:           data.bill_no,
    partyName:        data.party_name,
    grandTotal:       data.grand_total,
    billType:         data.bill_type,
    totalCartonCount: data.total_carton_count,
  };
};

export const deleteBill = async (id) => {
  const { error } = await supabase.from('bills').delete().eq('id', id);
  if (error) throw new Error(error.message);
  return true;
};

// ═══════════════════════════════════════════════
// PARTIES
// ═══════════════════════════════════════════════

export const getParties = async () => {
  const { data, error } = await supabase
    .from('parties').select('*').order('name', { ascending: true });
  if (error) throw new Error(error.message);
  return (data || []).map(p => ({ ...p, _id: p.id }));
};

export const addParty = async (party) => {
  const { data, error } = await supabase
    .from('parties').insert([party]).select().single();
  if (error) throw new Error(error.message);
  return { ...data, _id: data.id };
};

export const updateParty = async (id, party) => {
  const { data, error } = await supabase
    .from('parties').update(party).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return { ...data, _id: data.id };
};

export const deleteParty = async (id) => {
  const { error } = await supabase.from('parties').delete().eq('id', id);
  if (error) throw new Error(error.message);
  return true;
};

// ═══════════════════════════════════════════════
// PRODUCTIONS
// ═══════════════════════════════════════════════

export const getProductions = async () => {
  const { data, error } = await supabase
    .from('productions').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map(p => ({ ...p, _id: p.id }));
};

export const addProduction = async (prod) => {
  // Database columns ke mutabiq payload taiyar karein
  const payload = {
    date:           prod.date,
    roll_no:        prod.roll_no,
    jambo_type:     prod.jambo_type,
    micron:         prod.micron,
    width:          prod.width,
    core_side:      prod.core_side,
    core_brand:     prod.core_brand,
    core_ply:       prod.core_ply,
    core_qty_used:  Number(prod.core_qty_used),
    yards_per_core: Number(prod.yards_per_core),
    yards_used:     Number(prod.yards_used),
    roll_snapshot:  prod.roll_snapshot || null,
    core_snapshot:  prod.core_snapshot || null
  };

  const { data, error } = await supabase
    .from('productions')
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error("Production DB Error:", error.message);
    throw new Error(error.message);
  }
  return { ...data, _id: data.id };
};
export const updateProduction = async (id, prod) => {
  const { _id, id: _id2, created_at, ...rest } = prod;
  const { data, error } = await supabase
    .from('productions').update(rest).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return { ...data, _id: data.id };
};

export const deleteProduction = async (id) => {
  const { error } = await supabase.from('productions').delete().eq('id', id);
  if (error) throw new Error(error.message);
  return true;
};