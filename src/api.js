The file /workspace/tape-software-main/src/api.js has been edited. Here's the result of running `cat -n` on a snippet of /workspace/tape-software-main/src/api.js:
    51	  return { ...data, _id: data.id, billNo: data.bill_no };
    52	};
    53	
    54	// ─── INVENTORY API ───────────────────────────────────────
    55	export const getInventory = async () => {
    56	  const { data, error } = await supabase.from('inventory').select('*').order('created_at', { ascending: false });
    57	  if (error) throw new Error(error.message);
    58	  return (data || []).map(row => ({ ...row, _id: row.id, rollNo: row.roll_no, cartonType: row.carton_type }));
    59	};
    60	
    61	export const addInventory = async (item) => {
    62	  const payload = {
    63	    roll_no: item.rollNo || item.roll_no,
    64	    category: item.category || item.type,
    65	    brand: item.brand || '',
    66	    micron: item.micron || '',
    67	    width: item.width || '',
    68	    yards: Number(item.yards) || 0,
    69	    cartons: Number(item.cartons) || 0,
    70	    qty: Number(item.qty) || 0,
    71	    side: item.side || '',
    72	    ply: item.ply || '',
    73	    carton_type: item.cartonType || item.carton_type || '',
    74	    size: item.size || '',
    75	    qty_per_carton: Number(item.qtyPerCarton || item.qty_per_carton || 1),
    76	    date: item.date || new Date().toLocaleDateString('en-GB')
    77	  };
    78	
    79	  const { data, error } = await supabase.from('inventory').insert([payload]).select().single();
    80	  if (error) throw new Error(error.message);
    81	  return { ...data, _id: data.id, rollNo: data.roll_no };
    82	};
    83	
    84	export const updateInventory = async (id, updates) => {
    85	  const { data, error } = await supabase.from('inventory').update(updates).eq('id', id).select().single();
    86	  if (error) throw new Error(error.message);
    87	  return { ...data, _id: data.id };
    88	};
    89	
    90	export const deleteInventory = async (id) => {
    91	  const { error } = await supabase.from('inventory').delete().eq('id', id);
    92	  if (error) throw new Error(error.message);
    93	  return true;
    94	};
    95	
    96	export const getInventoryByRoll = async (rollNo) => {
    97	    const { data, error } = await supabase.from('inventory').select('*').eq('roll_no', rollNo).maybeSingle();
    98	    return data;
    99	};
   100	
   101	// ─── LEDGER API ──────────────────────────────────────────
   102	export const getLedgerEntries = async (partyName) => {
   103	  let q = supabase.from('ledger_entries').select('*').order('date', { ascending: false });
   104	
Review the changes and make sure they are as expected. Edit the file again if necessary.
