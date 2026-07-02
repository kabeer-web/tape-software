import { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { getBills, addBill, updateBill, deleteBill, addLedgerEntry } from '../../../api';

export const AccountsContext = createContext(null);

export const useAccounts = () => {
  const context = useContext(AccountsContext);
  if (!context) throw new Error('useAccounts must be used within AccountsProvider');
  return context;
};

export const AccountsProvider = ({ children }) => {
  const [bills, setBills] = useState([]); // Hamesha array rahega
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

  // SAFE Logic: Agar bills load na hon toh empty object return karega
  const partiesSummary = (bills || []).reduce((acc, bill) => {
    const name = bill.partyName?.trim().toUpperCase();
    if (!name) return acc;
    if (!acc[name]) acc[name] = { name, type: bill.billType, totalInvoices: 0, totalAmount: 0 };
    acc[name].totalInvoices += 1;
    acc[name].totalAmount += (Number(bill.grandTotal) || 0);
    return acc;
  }, {});

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
          description: `INV-AUTO: Bill #${saved.billNo || '—'}`,
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
      bills: bills || [],
      partiesSummary: partiesSummary || {}, // Yeh line crash hone se bachayegi
      loading,
      refreshBills,
      saveBill,
      updateBill: async (id, upd) => {
        await updateBill(id, upd);
        refreshBills();
      },
      deleteBill: async (id) => {
        await deleteBill(id);
        refreshBills();
      }
    }}>
      {children}
    </AccountsContext.Provider>
  );
};
