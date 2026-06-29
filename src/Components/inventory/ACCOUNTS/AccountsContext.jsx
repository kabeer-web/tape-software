// AccountsContext.jsx ki pehli line aisi honi chahiye:
import { createContext, useState, useEffect, useContext } from 'react';
import { getBills, addBill, updateBill, deleteBill, addLedgerEntry } from "../../api";

export const AccountsContext = createContext(null);

export const useAccounts = () => {
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
      // 1. Bill save karein
      const saved = await addBill(billData);
      
      // Bills ki list update karein
      setBills(prev => [saved, ...prev]);

      // 2. AUTO-LEDGER ENTRY (Is code ko dhyan se dekhein)
      try {
        const entryType = saved.billType === 'Purchase' ? 'credit' : 'debit';
        
        // Yahan call ho raha hai addLedgerEntry
        await addLedgerEntry({
          party_name:   saved.partyName,
          party_type:   saved.billType || 'Sale',
          entry_type:   entryType,
          description:  `Auto Bill Entry - Bill No: ${saved.billNo}`,
          amount:       parseFloat(saved.grandTotal) || 0,
          date:         saved.date || new Date().toLocaleDateString('en-GB'),
          ref_bill_no:  saved.billNo,
          bill_id:      saved._id 
        });
        console.log("✅ Ledger auto-updated!");
      } catch (ledgerErr) {
        console.error("❌ Ledger auto-update failed, but bill was saved:", ledgerErr);
      }

      return saved._id;
    } catch (err) {
      console.error('saveBill main error:', err);
      throw err;
    }
  };
  const updateBillData = async (id, updatedBill) => {
    try {
      const updated = await updateBill(id, updatedBill);
      setBills(prev => prev.map(b => b._id === id ? updated : b));
    } catch (err) {
      console.error('updateBill error:', err);
    }
  };

  const deleteBillData = async (id) => {
    try {
      await deleteBill(id);
      setBills(prev => prev.filter(b => b._id !== id));
    } catch (err) {
      console.error('deleteBill error:', err);
    }
  };

  return (
    <AccountsContext.Provider value={{
      bills, parties, loading,
      saveBill,
      updateBill: updateBillData,
      deleteBill: deleteBillData
    }}>
      {children}
    </AccountsContext.Provider>
  );
};
