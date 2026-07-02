import { createContext, useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { getBills, addBill, updateBill, deleteBill, addLedgerEntry } from '../../../api';

// Initialize with safe default values
export const AccountsContext = createContext({
  bills: [],
  partiesSummary: {},
  loading: true,
  refreshBills: () => {}
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

  // Guaranteed Object: It will always return an object {} even if bills are empty
  const partiesSummary = useMemo(() => {
    if (!bills || bills.length === 0) return {};
    return bills.reduce((acc, bill) => {
      const name = bill.partyName?.trim().toUpperCase();
      if (!name) return acc;
      if (!acc[name]) acc[name] = { name, type: bill.billType, total: 0 };
      acc[name].total += (Number(bill.grandTotal) || 0);
      return acc;
    }, {});
  }, [bills]);

  const saveBill = async (billData) => {
    try {
      const saved = await addBill(billData);
      setBills(prev => [saved, ...prev]);
      return saved._id;
    } catch (err) { throw err; }
  };

  return (
    <AccountsContext.Provider value={{
      bills, 
      partiesSummary, // Dashboard use karta hai client base ke liye
      loading, 
      refreshBills,
      saveBill, 
      updateBill, 
      deleteBill
    }}>
      {children}
    </AccountsContext.Provider>
  );
};
