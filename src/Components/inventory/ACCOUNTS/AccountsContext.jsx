import { createContext, useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { 
  getBills, addBill, updateBill, deleteBill, 
  getLedgerEntries, addLedgerEntry, updateLedgerEntry, deleteLedgerEntry 
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
      saveBill: addBill,
      updateEntry: handleUpdateEntry,
      deleteEntry: handleDeleteEntry,
      postLedger: addLedgerEntry
    }}>
      {children}
    </AccountsContext.Provider>
  );
};
