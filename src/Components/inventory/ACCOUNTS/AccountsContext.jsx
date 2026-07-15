import { createContext, useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { 
  getBills, addBill, updateBill, deleteBill, 
  getLedgerEntries, addLedgerEntry, updateLedgerEntry, deleteLedgerEntry,
  logActivity
} from '../../../api';

export const AccountsContext = createContext({
  bills: [], ledger: [], partiesSummary: {}, loading: true, refreshAll: () => {}
});

export const useAccounts = () => useContext(AccountsContext);

export const AccountsProvider = ({ children }) => {
  const [bills, setBills] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);

  const refreshAll = useCallback(async () => {
    try {
      setLoading(true);
      const [billsData, ledgerData] = await Promise.all([getBills(), getLedgerEntries()]);
      setBills(Array.isArray(billsData) ? billsData : []);
      setLedger(Array.isArray(ledgerData) ? ledgerData : []);
    } catch (e) {
      console.error("Sync Error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refreshAll(); }, [refreshAll]);

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

  return (
    <AccountsContext.Provider value={{
      bills, ledger, partiesSummary, loading, refreshAll,
      saveBill: handleSaveBill,
      updateBill: handleUpdateBill,
      deleteBill: handleDeleteBill,
      updateEntry: handleUpdateEntry,
      deleteEntry: handleDeleteEntry,
      postLedger: handlePostLedger,
      getLedgerEntryForBill
    }}>
      {children}
    </AccountsContext.Provider>
  );
};