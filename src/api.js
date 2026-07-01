import { supabase } from './supabase';

// ─── LEDGER API ──────────────────────────────────────────
export const getLedgerEntries = async (partyName) => {
  let q = supabase.from('ledger_entries').select('*').order('date', { ascending: false });
  if (partyName) {
    // ilike makes search case-insensitive and flexible
    q = q.ilike('party_name', `%${partyName.trim()}%`);
  }
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data || []).map(e => ({ ...e, _id: e.id }));
};

export const addLedgerEntry = async (entry) => {
  const { data, error } = await supabase.from('ledger_entries').insert([{
    ...entry,
    amount: Number(entry.amount) || 0,
    date: entry.date || new Date().toLocaleDateString('en-GB')
  }]).select().single();
  if (error) throw new Error(error.message);
  return { ...data, _id: data.id };
};

export const updateLedgerEntry = async (id, updates) => {
  const { data, error } = await supabase.from('ledger_entries')
    .update(updates).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return { ...data, _id: data.id };
};

export const deleteLedgerEntry = async (id) => {
  const { error } = await supabase.from('ledger_entries').delete().eq('id', id);
  if (error) throw new Error(error.message);
  return true;
};

// ─── INVENTORY API ───────────────────────────────────────
export const getInventory = async () => {
  const { data, error } = await supabase.from('inventory').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map(row => ({
    ...row,
    _id:        row.id,
    rollNo:     row.roll_no,
    cartonType: row.carton_type,
  }));
};

export const addInventory = async (item) => {
  // Logic: Ensure all values are mapped correctly to Supabase Columns
  const payload = {
    category:    item.category    || null,
    type:        item.type        || item.category || null,
    date:        item.date        || new Date().toLocaleDateString('en-GB'),
    roll_no:     String(item.rollNo || item.roll_no || ''),
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

  const { data, error } = await supabase.from('inventory').insert([payload]).select().single();
  if (error) throw new Error(error.message);
  return { ...data, _id: data.id, rollNo: data.roll_no, cartonType: data.carton_type };
};

export const updateInventory = async (id, updates) => {
  const { data, error } = await supabase.from('inventory').update(updates).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return { ...data, _id: data.id, rollNo: data.roll_no };
};

export const deleteInventory = async (id) => {
  const { error } = await supabase.from('inventory').delete().eq('id', id);
  if (error) throw new Error(error.message);
  return true;
};

// ─── BILLS, PARTIES & PRODUCTIONS ────────────────────────
export const getBills = async () => {
  const { data, error } = await supabase.from('bills').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map(b => ({ ...b, _id: b.id, billNo: b.bill_no, partyName: b.party_name }));
};

export const getParties = async () => {
  const { data, error } = await supabase.from('parties').select('*').order('name', { ascending: true });
  if (error) throw new Error(error.message);
  return (data || []).map(p => ({ ...p, _id: p.id }));
};

export const getProductions = async () => {
  const { data, error } = await supabase.from('productions').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map(p => ({ ...p, _id: p.id }));
};
