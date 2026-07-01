import { supabase } from './supabase';

// ─── HS PACKAGES INVENTORY SYNC (THE MISSING EXPORT) ──────
export const syncHSStock = async (item, multiplier) => {
  const { data: records } = await supabase.from('inventory')
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

// ─── BILLS / INVOICE API ────────────────────────────────
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
    party_name: bill.partyName,
    date: bill.date || new Date().toLocaleDateString('en-GB'),
    items: bill.items || [],
    total_carton_count: Number(bill.totalCartons || 0),
    grand_total: Number(bill.grandTotal || 0),
    amount_in_words: bill.amountInWords || ''
  };

  const { data, error } = await supabase.from('bills').insert([payload]).select().single();
  if (error) throw new Error(error.message);
  return { ...data, _id: data.id, billNo: data.bill_no };
};

// ─── INVENTORY API ───────────────────────────────────────
export const getInventory = async () => {
  const { data, error } = await supabase.from('inventory').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map(row => ({ ...row, _id: row.id, rollNo: row.roll_no, cartonType: row.carton_type }));
};

export const updateInventory = async (id, updates) => {
  const { data, error } = await supabase.from('inventory').update(updates).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return { ...data, _id: data.id };
};

export const getInventoryByRoll = async (rollNo) => {
    const { data, error } = await supabase.from('inventory').select('*').eq('roll_no', rollNo).maybeSingle();
    return data;
};

// ─── LEDGER API ──────────────────────────────────────────
export const getLedgerEntries = async (partyName) => {
  let q = supabase.from('ledger_entries').select('*').order('date', { ascending: false });
  if (partyName) q = q.ilike('party_name', `%${partyName.trim()}%`);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data || []).map(e => ({ ...e, _id: e.id }));
};

export const addLedgerEntry = async (entry) => {
  const { data, error } = await supabase.from('ledger_entries').insert([entry]).select().single();
  if (error) throw new Error(error.message);
  return data;
};

// ─── PRODUCTIONS API ─────────────────────────────────────
export const getProductions = async () => {
  const { data, error } = await supabase.from('productions').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map(p => ({ ...p, _id: p.id }));
};

export const addProduction = async (prod) => {
    const { data, error } = await supabase.from('productions').insert([prod]).select().single();
    if (error) throw new Error(error.message);
    return data;
};

export const deleteBill = async (id) => {
    const { error } = await supabase.from('bills').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return true;
};
