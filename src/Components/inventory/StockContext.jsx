export const StockProvider = ({ children }) => {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);

  const refreshInventory = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getInventory();
      setInventory(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { refreshInventory(); }, [refreshInventory]);

  // AUTO ROLL NUMBER LOGIC
  const addRoll = async (item) => {
    // Sabse bada roll number dhoond kar +1 karna
    const maxRoll = inventory.length > 0 
      ? Math.max(...inventory.map(i => parseInt(i.rollNo) || 0)) 
      : 1000;
      
    const payload = { 
      ...item, 
      rollNo: maxRoll + 1, // Auto Increment
      date: item.date || new Date().toLocaleDateString('en-GB') 
    };
    
    const saved = await addInventory(payload);
    setInventory(prev => [saved, ...prev]);
    return saved;
  };

  // YARDS EDIT KARNE KE LIYE
  const editItemYards = async (id, newYards) => {
    const updated = await updateInventory(id, { yards: newYards });
    setInventory(prev => prev.map(i => (i._id === id ? updated : i)));
  };

  // YARDS MINUS (ISSUE) KARNE KE LIYE
  const issueYards = async (id, qty) => {
    const item = inventory.find(i => i._id === id);
    if (!item) return;
    const newQty = Math.max(0, (Number(item.yards) - qty)).toFixed(2);
    const updated = await updateInventory(id, { yards: parseFloat(newQty) });
    setInventory(prev => prev.map(i => (i._id === id ? updated : i)));
  };

  const removeItem = async (id) => {
    await deleteInventory(id);
    setInventory(prev => prev.filter(i => i._id !== id));
  };

  return (
    <StockContext.Provider value={{
      inventory, loading, refreshInventory,
      addRoll, removeItem, issueYards, editItemYards
    }}>
      {children}
    </StockContext.Provider>
  );
};
