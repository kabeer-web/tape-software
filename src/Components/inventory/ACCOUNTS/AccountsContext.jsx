import { createContext, useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { getBills, addBill, updateBill, deleteBill, addLedgerEntry } from '../../../api';

export const AccountsContext = createContext(null);

export const useAccounts = () => {
  const context = useContext(AccountsContext);
  if (!context) return { bills: [], partiesSummary: {}, loading: true }; // Safe fallback
  return context;
};

export const AccountsProvider = ({ children }) => {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);

  const refreshBills = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getBills();
      setBills(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Bills Load Error:", e);
      setBills([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refreshBills(); }, [refreshBills]);

  // Guaranteed Object: Kabhi undefined nahi hoga
  const partiesSummary = useMemo(() => {
    if (!Array.isArray(bills)) return {};
    return bills.reduce((acc, bill) => {
      const name = bill.partyName?.trim().toUpperCase();
      if (!name) return acc;
      if (!acc[name]) acc[name] = { name, type: bill.billType, totalAmount: 0 };
      acc[name].totalAmount += (Number(bill.grandTotal) || 0);
      return acc;
    }, {});
  }, [bills]);

  const saveBill = async (billData) => {
    try {
      const saved = await addBill(billData);
      setBills(prev => [saved, ...prev]);
      if (saved.partyName && saved.grandTotal > 0) {
        const isSale = saved.billType === 'Sale';
        await addLedgerEntry({
          party_name:  saved.partyName.toUpperCase(),
          party_type:  saved.billType,
          entry_type:  isSale ? 'debit' : 'credit',
          description: `AUTO: Bill #${saved.billNo || '—'}`,
          amount:      Number(saved.grandTotal),
          date:        saved.date,
          bill_id:     saved._id,
        });
      }
      return saved._id;
    } catch (err) {
      console.error('SaveBill Error:', err);
      throw err;
    }
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
