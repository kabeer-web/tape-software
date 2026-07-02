import { createContext, useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { getBills, addBill, updateBill, deleteBill, addLedgerEntry } from '../../../api';

// Initialize with empty object instead of null to prevent "null to object" errors
export const AccountsContext = createContext({
  bills: [], partiesSummary: {}, loading: true
});

export const useAccounts = () => useContext(AccountsContext);

export const AccountsProvider = ({ children }) => {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);

  const refreshBills = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getBills();
      setBills(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Load Error:", e);
      setBills([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refreshBills(); }, [refreshBills]);

  const partiesSummary = useMemo(() => {
    if (!bills || !Array.isArray(bills)) return {};
    return bills.reduce((acc, bill) => {
      const name = bill.partyName?.trim().toUpperCase();
      if (!name) return acc;
      if (!acc[name]) acc[name] = { name, type: bill.billType || 'Sale', total: 0 };
      acc[name].total += (Number(bill.grandTotal) || 0);
      return acc;
    }, {});
  }, [bills]);

  const saveBill = async (billData) => {
    try {
      const saved = await addBill(billData);
      setBills(prev => [saved, ...prev]);
      if (saved.partyName && saved.grandTotal > 0) {
        await addLedgerEntry({
          party_name:  saved.partyName.toUpperCase(),
          party_type:  saved.billType,
          entry_type:  saved.billType === 'Sale' ? 'debit' : 'credit',
          description: `BILL #${saved.billNo}`,
          amount:      Number(saved.grandTotal),
          date:        saved.date,
          bill_id:     saved._id
        });
      }
      return saved._id;
    } catch (err) { throw err; }
  };

  return (
    <AccountsContext.Provider value={{
      bills, partiesSummary, loading, refreshBills,
      saveBill, updateBill, deleteBill
    }}>
      {children}
    </AccountsContext.Provider>
  );
};
