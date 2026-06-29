import { createContext, useState, useEffect, useContext } from 'react';
import { getBills, addBill, updateBill, deleteBill } from '../../../api';

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

  // AccountsProvider ke andar saveBill function ko replace karein:

const saveBill = async (billData) => {
  try {
    // 1. Bill Save Karo
    const savedBill = await addBill(billData);
    
    // 2. Auto Ledger Entry Create Karo
    // Agar Sale hai to 'debit' (customer se paise lene hain)
    // Agar Purchase hai to 'credit' (supplier ko paise dene hain)
    const ledgerPayload = {
      party_name:   savedBill.partyName,
      party_type:   savedBill.billType,
      entry_type:   savedBill.billType === 'Sale' ? 'debit' : 'credit',
      description:  `Bill No: ${savedBill.billNo} (Auto Generated)`,
      amount:       parseFloat(savedBill.grandTotal),
      date:         savedBill.date,
      ref_bill_no:  savedBill.billNo,
      bill_id:      savedBill._id // Link with Bill
    };

    await addLedgerEntry(ledgerPayload);
    
    setBills(prev => [savedBill, ...prev]);
    return savedBill._id;
  } catch (err) {
    console.error('saveBill & Ledger Error:', err);
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
