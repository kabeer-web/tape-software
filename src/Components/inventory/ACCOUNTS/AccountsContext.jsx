import { createContext, useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { 
  getBills, addBill, updateBill, deleteBill, 
  getLedgerEntries, addLedgerEntry, updateLedgerEntry, deleteLedgerEntry,
  getParties, addParty, updateParty, deleteParty,
  logActivity
} from '../../../api';
import { supabase } from '../../../supabase';

export const AccountsContext = createContext({
  bills: [], ledger: [], parties: [], partiesSummary: {}, loading: true, refreshAll: () => {}
});

export const useAccounts = () => useContext(AccountsContext);

export const AccountsProvider = ({ children }) => {
  const [bills, setBills] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(true);

  const refreshAll = useCallback(async () => {
    try {
      setLoading(true);
      const [billsData, ledgerData, partiesData] = await Promise.all([getBills(), getLedgerEntries(), getParties()]);
      setBills(Array.isArray(billsData) ? billsData : []);
      setLedger(Array.isArray(ledgerData) ? ledgerData : []);
      setParties(Array.isArray(partiesData) ? partiesData : []);
    } catch (e) {
      console.error("Sync Error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refreshAll(); }, [refreshAll]);

  // ── Real-time parties ────────────────────────────────────
  // A party added/renamed/deleted anywhere (Ledger's "+ New Party", a
  // rename, etc.) updates the `parties` table immediately, and this pushes
  // that change live into every open tab/page — including the Sale/Purchase
  // Invoice party search, without needing a manual refresh or reload.
  useEffect(() => {
    // Unique name per mount — a fixed name like 'parties_live' can collide
    // if this effect runs twice (React StrictMode's mount→cleanup→mount in
    // dev, or the provider remounting), throwing "cannot add
    // postgres_changes callbacks... after subscribe()" because Supabase
    // reuses/errors on a channel that's already subscribed under that name.
    const channelName = `parties_live_${Math.random().toString(36).slice(2)}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'parties' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const row = { ...payload.new, _id: payload.new.id };
          setParties(prev => prev.some(p => p._id === row._id) ? prev : [...prev, row].sort((a,b)=>a.name.localeCompare(b.name)));
        } else if (payload.eventType === 'UPDATE') {
          const row = { ...payload.new, _id: payload.new.id };
          setParties(prev => prev.map(p => p._id === row._id ? row : p).sort((a,b)=>a.name.localeCompare(b.name)));
        } else if (payload.eventType === 'DELETE') {
          setParties(prev => prev.filter(p => p._id !== payload.old.id));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Logic: Combine Bills and Ledger to find all unique parties
  const partiesSummary = useMemo(() => {
    const summary = {};
    const process = (name, type, amount, isDebit) => {
      const n = name?.trim().toUpperCase();
      if (!n) return;
      if (!summary[n]) summary[n] = { name: n, type: type || 'Sale', debit: 0, credit: 0, balance: 0 };
      if (isDebit) summary[n].debit += Number(amount || 0);
      else summary[n].credit += Number(amount || 0);
      summary[n].balance = summary[n].debit - summary[n].credit;
    };

    ledger.forEach(e => process(e.party_name, e.party_type, e.amount, e.entry_type === 'debit'));
    return summary;
  }, [ledger]);

  const handleSaveBill = async (billData) => {
    const saved = await addBill(billData);
    setBills(prev => [saved, ...prev]);
    logActivity({
      action: 'add',
      entity: 'Bill',
      category: billData.billType,
      label: `${billData.billType} bill #${billData.billNo || saved.id} saved — ${billData.partyName}`,
      partyName: billData.partyName,
      amount: billData.grandTotal,
    });
    return saved;
  };

  const handleUpdateBill = async (id, updates) => {
    const updated = await updateBill(id, updates);
    setBills(prev => prev.map(b => (b._id === id || b.id === id) ? updated : b));
    logActivity({
      action: 'edit',
      entity: 'Bill',
      category: updated.billType,
      label: `${updated.billType} bill #${updated.billNo || updated._id} edited — ${updated.partyName}`,
      partyName: updated.partyName,
      amount: updated.grandTotal,
    });
    return updated;
  };

  const handleDeleteBill = async (id) => {
    const bill = bills.find(b => b._id === id || b.id === id);
    await deleteBill(id);
    setBills(prev => prev.filter(b => b._id !== id && b.id !== id));
    if (bill) {
      logActivity({
        action: 'delete',
        entity: 'Bill',
        category: bill.billType,
        label: `${bill.billType} bill #${bill.billNo || bill._id} deleted — ${bill.partyName}`,
        partyName: bill.partyName,
        amount: bill.grandTotal,
      });
    }
  };

  const getLedgerEntryForBill = (billId) => ledger.find(e => e.bill_id === billId);

  // Convention (kept consistent across Purchase/Sale so partiesSummary math
  // stays correct): entry_type 'debit' = the party owes US money (Sale —
  // increases their balance). entry_type 'credit' = WE owe the party money
  // (Purchase — decreases their balance, i.e. a supplier we owe shows a
  // negative balance here).
  const handlePostLedger = async (entry) => {
    const saved = await addLedgerEntry(entry);
    setLedger(prev => [saved, ...prev]);
    return saved;
  };

  const handleUpdateEntry = async (id, updates) => {
    await updateLedgerEntry(id, updates);
    await refreshAll();
  };

  const handleDeleteEntry = async (id) => {
    await deleteLedgerEntry(id);
    await refreshAll();
  };

  // ── Parties (real table — this is the actual fix) ─────────
  // Was: a party only existed as text scattered across ledger_entries and
  // bills, guessed at client-side (hardcoded arrays + whatever showed up in
  // entries). A brand-new party lived only in a component's local state
  // until its first ledger entry, and "renaming" meant bulk-editing every
  // entry's text with nothing canonical to anchor it — so it could look
  // like it worked and then not survive a reload. Now every party is a real
  // row in `parties`, added/renamed/deleted directly, live everywhere via
  // the realtime subscription above.
  const handleAddParty = async (name, type) => {
    const saved = await addParty(name, type);
    setParties(prev => prev.some(p => p.name === saved.name) ? prev : [...prev, saved].sort((a,b)=>a.name.localeCompare(b.name)));
    logActivity({ action: 'add', entity: 'Party', category: type, label: `Party added — ${saved.name} (${type})`, partyName: saved.name });
    return saved;
  };

  // Renames the canonical party record AND every ledger entry already
  // attributed to it (so that party's own ledger history stays correctly
  // labeled). Bills already saved under the old name are left as-is on
  // purpose — an invoice should keep showing the name as it was billed,
  // like a real paper trail would.
  const handleRenameParty = async (party, newName) => {
    const clean = newName.trim().toUpperCase();
    if (!clean || clean === party.name) return party;
    const updated = await updateParty(party._id, { name: clean });
    setParties(prev => prev.map(p => p._id === party._id ? updated : p));

    const affected = ledger.filter(e => (e.party_name || '').toUpperCase() === party.name.toUpperCase());
    for (const e of affected) {
      await updateLedgerEntry(e._id, { party_name: clean });
    }
    setLedger(prev => prev.map(e => (e.party_name || '').toUpperCase() === party.name.toUpperCase() ? { ...e, party_name: clean } : e));

    logActivity({ action: 'edit', entity: 'Party', category: party.type, label: `Party renamed — ${party.name} → ${clean}`, partyName: clean });
    return updated;
  };

  // Removes the party record and its ledger trail. Bills already saved for
  // that party are left untouched — deleting a party shouldn't erase past
  // invoices.
  const handleDeleteParty = async (party) => {
    const affected = ledger.filter(e => (e.party_name || '').toUpperCase() === party.name.toUpperCase());
    for (const e of affected) {
      await deleteLedgerEntry(e._id);
    }
    setLedger(prev => prev.filter(e => (e.party_name || '').toUpperCase() !== party.name.toUpperCase()));
    await deleteParty(party._id);
    setParties(prev => prev.filter(p => p._id !== party._id));
    logActivity({ action: 'delete', entity: 'Party', category: party.type, label: `Party deleted — ${party.name}`, partyName: party.name });
  };

  return (
    <AccountsContext.Provider value={{
      bills, ledger, parties, partiesSummary, loading, refreshAll,
      saveBill: handleSaveBill,
      updateBill: handleUpdateBill,
      deleteBill: handleDeleteBill,
      updateEntry: handleUpdateEntry,
      deleteEntry: handleDeleteEntry,
      postLedger: handlePostLedger,
      getLedgerEntryForBill,
      addParty: handleAddParty,
      renameParty: handleRenameParty,
      deleteParty: handleDeleteParty,
    }}>
      {children}
    </AccountsContext.Provider>
  );
};
