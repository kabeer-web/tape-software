import { supabase } from './supabase';

// ─── LEDGER API ──────────────────────────────────────────
export const getLedgerEntries = async (partyName) => {
  let q = supabase.from('ledger_entries').select('*').order('date', { ascending: false });
  if (partyName) {
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
  const { data, error } = await supabase.from('ledger_entries').update(updates).eq('id', id).select().single();
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

export const getInventoryByRoll = async (rollNo) => {
  const trimmed = String(rollNo).trim();
  const padded  = trimmed.padStart(3, '0');
  const stripped = trimmed.replace(/^0+/, '') || '0';

  const { data: d1 } = await supabase.from('inventory').select('*').eq('roll_no', trimmed).maybeSingle();
  if (d1) return { ...d1, _id: d1.id, rollNo: d1.roll_no };

  const { data: d2 } = await supabase.from('inventory').select('*').eq('roll_no', padded).maybeSingle();
  if (d2) return { ...d2, _id: d2.id, rollNo: d2.roll_no };

  const { data: all } = await supabase.from('inventory').select('*').not('category', 'in', '("Core","Carton")');
  const found = (all || []).find(i => (String(i.roll_no || '').replace(/^0+/, '') || '0') === stripped);
  if (found) return { ...found, _id: found.id, rollNo: found.roll_no };
  return null;
};

export const addInventory = async (item) => {
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
  return { ...data, _id: data.id, rollNo: data.roll_no, cartonType: data.carton_type };
};

export const deleteInventory = async (id) => {
  const { error } = await supabase.from('inventory').delete().eq('id', id);
  if (error) throw new Error(error.message);
  return true;
};

// CRITICAL: Stock Sync for Invoices
export const syncProductStock = async (brand, size, type, qtyDelta) => {
  const { data: items } = await supabase.from('inventory')
    .select('*')
    .ilike('brand', brand)
    .ilike('size', size);

  if (items && items.length > 0) {
    const item = items[0];
    const newQty = Math.max(0, (Number(item.qty) || 0) + qtyDelta);
    await supabase.from('inventory').update({ qty: newQty }).eq('id', item.id);
    return true;
  }
  return false;
};

// ─── BILLS API ──────────────────────────────────────────
export const getBills = async () => {
  const { data, error } = await supabase.from('bills').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map(b => ({ ...b, _id: b.id, billNo: b.bill_no, partyName: b.party_name }));
};

export const addBill = async (bill) => {
  const { data: lastBill } = await supabase.from('bills').select('bill_no').order('bill_no', { ascending: false }).limit(1).maybeSingle();
  const nextBillNo = lastBill ? Number(lastBill.bill_no) + 1 : 1001;

  const payload = {
    bill_no: nextBillNo,
    bill_type: bill.billType || 'Sale',
    party_name: bill.partyName,
    date: bill.date || new Date().toLocaleDateString('en-GB'),
    items: bill.items || [],
    total_carton_count: Number(bill.totalCartonCount) || 0,
    grand_total: Number(bill.grandTotal) || 0,
    vehicle_no: bill.vehicleNo || '',
    receiver_name: bill.receiverName || '',
    amount_in_words: bill.amountInWords || ''
  };
  const { data, error } = await supabase.from('bills').insert([payload]).select().single();
  if (error) throw new Error(error.message);
  return { ...data, _id: data.id };
};

export const updateBill = async (id, bill) => {
  const { data, error } = await supabase.from('bills').update(bill).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return { ...data, _id: data.id };
};

export const deleteBill = async (id) => {
  const { error } = await supabase.from('bills').delete().eq('id', id);
  if (error) throw new Error(error.message);
  return true;
};

// ─── PARTIES API ─────────────────────────────────────────
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

export const updateParty = async (id, party) => {
  const { data, error } = await supabase.from('parties').update(party).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return { ...data, _id: data.id };
};

export const deleteParty = async (id) => {
  const { error } = await supabase.from('parties').delete().eq('id', id);
  if (error) throw new Error(error.message);
  return true;
};

// ─── PRODUCTIONS API ─────────────────────────────────────
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

export const updateProduction = async (id, prod) => {
  const { _id, id: _i, created_at, ...rest } = prod;
  const { data, error } = await supabase.from('productions').update(rest).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return { ...data, _id: data.id };
};

export const deleteProduction = async (id) => {
  const { error } = await supabase.from('productions').delete().eq('id', id);
  if (error) throw new Error(error.message);
  return true;
};
