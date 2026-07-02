import { createContext, useState, useEffect, useContext } from 'react';
import {
  getBills, addBill, updateBill, deleteBill,
  addLedgerEntry
} from '../../../api';

export const AccountsContext = createContext(null);

export const useAccounts = () => {import { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { getBills, addBill, updateBill, deleteBill, addLedgerEntry } from '../../../api';

export const AccountsContext = createContext(null);

export const useAccounts = () => {
  const context = useContext(AccountsContext);
  if (!context) throw new Error('useAccounts must be used within AccountsProvider');
  return context;
};

export const AccountsProvider = ({ children }) => {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);

  const refreshBills = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getBills();
      setBills(data || []);
    } catch (e) { console.error("Bills Load Error:", e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { refreshBills(); }, [refreshBills]);

  // CRP Logic: Automatically group parties from bills
  const partiesSummary = bills.reduce((acc, bill) => {
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

      // Auto-Posting to Ledger (CRP Standard)
      if (saved.partyName && saved.grandTotal > 0) {
        const isSale = saved.billType === 'Sale';
        await addLedgerEntry({
          party_name:  saved.partyName.toUpperCase(),
          party_type:  saved.billType,
          entry_type:  isSale ? 'debit' : 'credit', // Sale is Debit (Receivable), Purchase is Credit (Payable)
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
      bills, partiesSummary, loading, refreshBills,
      saveBill, updateBill, deleteBill
    }}>
      {children}
    </AccountsContext.Provider>
  );
};
  const context = useContext(AccountsContext);
  if (!context) throw new Error('useAccounts must be used within AccountsProvider');
  return context;
};

export const AccountsProvider = ({ children }) => {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getBills()
      .then(data => setBills(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const parties = bills.reduce((acc, bill) => {
    const key = bill.partyName?.trim().toLowerCase();
    if (!key) return acc;
    const totalCarton = bill.items?.reduce((s, i) =>
      s + (parseFloat(i.totalCarton) || parseFloat(i.qty) || 0), 0) || 0;
    
    const entry = {
      billId: bill._id, 
      billNo: bill.billNo,
      date: bill.date, 
      totalCarton, 
      grandTotal: bill.grandTotal
    };
    
    if (!acc[key]) acc[key] = { name: bill.partyName, type: bill.billType, entries: [] };
    acc[key].entries.push(entry);
    return acc;
  }, {});

  const saveBill = async (billData) => {
    try {
      const saved = await addBill(billData);
      setBills(prev => [saved, ...prev]);

      if (saved.partyName && saved.grandTotal > 0) {
        const entryType = saved.billType === 'Purchase' ? 'credit' : 'debit';
        await addLedgerEntry({
          party_name:  saved.partyName,
          party_type:  saved.billType || 'Sale',
          entry_type:  entryType,
          description: `Bill #${saved.billNo || '—'} — ${saved.billType} Invoice`,
          amount:      saved.grandTotal,
          date:        saved.date,
          ref_bill_no: saved.billNo || '',
          bill_id:     saved._id,
        });
      }
      return saved._id;
    } catch (err) {
      console.error('saveBill error:', err);
      throw err;
    }
  };

  const updateBillData = async (id, updatedBill) => {
    try {
      const updated = await updateBill(id, updatedBill);
      setBills(prev => prev.map(b => b._id === id ? updated : b));
    } catch (err) { console.error('updateBill error:', err); }
  };

  const deleteBillData = async (id) => {
    try {
      await deleteBill(id);
      setBills(prev => prev.filter(b => b._id !== id));
    } catch (err) { console.error('deleteBill error:', err); }
  };

  return (
    <AccountsContext.Provider value={{
      bills, parties, loading,
      saveBill,
      updateBill: updateBillData,
      deleteBill: deleteBillData,
    }}>
      {children}
    </AccountsContext.Provider>
  );
};
