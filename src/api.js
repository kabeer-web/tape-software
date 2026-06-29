import { supabase } from './supabase';

// ─── LEDGER ──────────────────────────────────────────────
export const getLedgerEntries = async (partyName) => {
  let q = supabase.from('ledger_entries').select('*').order('date', { ascending: true });
  if (partyName) q = q.eq('party_name', partyName);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data || []).map(e => ({ ...e, _id: e.id }));
};

export const addLedgerEntry = async (entry) => {
  const { data, error } = await supabase
    .from('ledger_entries').insert([entry]).select().single();
  if (error) throw new Error(error.message);
  return { ...data, _id: data.id };
};

export const updateLedgerEntry = async (id, updates) => {
  const { data, error } = await supabase
    .from('ledger_entries').update(updates).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return { ...data, _id: data.id };
};

export const deleteLedgerEntry = async (id) => {
  const { error } = await supabase.from('ledger_entries').delete().eq('id', id);
  if (error) throw new Error(error.message);
  return true;
};

// ═══════════════════════════════════════
// INVENTORY
// ═══════════════════════════════════════

export const getInventory = async () => {
  const { data, error } = await supabase
    .from('inventory').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map(row => ({
    ...row,
    _id:        row.id,
    rollNo:     row.roll_no,
    cartonType: row.carton_type,
  }));
};

export const getInventoryByRoll = async (rollNo) => {
  const trimmed = String(rollNo).trim();
  const padded  = trimmed.padStart(3, '0');
  const stripped = trimmed.replace(/^0+/, '') || '0';

  // Try exact match
  const { data: d1 } = await supabase.from('inventory').select('*').eq('roll_no', trimmed).maybeSingle();
  if (d1) return { ...d1, _id: d1.id, rollNo: d1.roll_no };

  // Try padded
  const { data: d2 } = await supabase.from('inventory').select('*').eq('roll_no', padded).maybeSingle();
  if (d2) return { ...d2, _id: d2.id, rollNo: d2.roll_no };

  // Try all jambo rolls and match by stripping zeros
  const { data: all } = await supabase.from('inventory').select('*')
    .not('category', 'in', '("Core","Carton")');
  const found = (all || []).find(i =>
    (String(i.roll_no || '').replace(/^0+/, '') || '0') === stripped
  );
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

// ═══════════════════════════════════════
// BILLS
// ═══════════════════════════════════════

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
  const { data, error } = await supabase.from('bills').insert([{
    bill_type:          bill.billType         || 'Sale',
    bill_no:            bill.billNo           || '',
    party_name:         bill.partyName        || '',
    date:               bill.date             || '',
    grand_total:        bill.grandTotal       || 0,
    items:              bill.items            || [],
    total_carton_count: bill.totalCartonCount || 0,
    carton_used:        bill.cartonUsed       || null,
    logo:               bill.logo             || null,
  }]).select().single();
  if (error) throw new Error(error.message);
  return {
    ...data, _id: data.id,
    billNo: data.bill_no, partyName: data.party_name,
    grandTotal: data.grand_total, billType: data.bill_type,
    totalCartonCount: data.total_carton_count,
  };
};

export const updateBill = async (id, bill) => {
  const { data, error } = await supabase.from('bills').update({
    bill_no:            bill.billNo,
    party_name:         bill.partyName,
    date:               bill.date,
    grand_total:        bill.grandTotal       || 0,
    items:              bill.items            || [],
    total_carton_count: bill.totalCartonCount || 0,
  }).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return {
    ...data, _id: data.id,
    billNo: data.bill_no, partyName: data.party_name,
    grandTotal: data.grand_total, billType: data.bill_type,
    totalCartonCount: data.total_carton_count,
  };
};

export const deleteBill = async (id) => {
  const { error } = await supabase.from('bills').delete().eq('id', id);
  if (error) throw new Error(error.message);
  return true;
};

// ═══════════════════════════════════════
// PARTIES
// ═══════════════════════════════════════

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

// ═══════════════════════════════════════
// PRODUCTIONS
// ═══════════════════════════════════════

export const getProductions = async () => {
  const { data, error } = await supabase
    .from('productions').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map(p => ({ ...p, _id: p.id }));
};

export const addProduction = async (prod) => {
  const { _id, id, created_at, ...rest } = prod;
  const { data, error } = await supabase
    .from('productions').insert([rest]).select().single();
  if (error) throw new Error(error.message);
  return { ...data, _id: data.id };
};

export const updateProduction = async (id, prod) => {
  const { _id, id: _i, created_at, ...rest } = prod;
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

/*
SUPABASE SCHEMA UPDATES:
create table ledger_entries (
  id uuid default gen_random_uuid() primary key,
  party_name text not null,
  party_type text default 'Sale',
  entry_type text not null,
  description text,
  amount numeric default 0,
  date text,
  ref_bill_no text,
  bill_id uuid references bills(id) on delete cascade, -- Added for Auto Sync
  created_at timestamptz default now()
);

alter table ledger_entries enable row level security;
create policy "Allow all" on ledger_entries for all using (true) with check (true);
*/
