// inside StockProvider
const [notifications, setNotifications] = useState([]);

const addNotification = (message, type = 'info') => {
  const newNotif = { id: Date.now(), message, type, time: new Date() };
  setNotifications(prev => [newNotif, ...prev]);
};

const dismissNotification = (id) => {
  setNotifications(prev => prev.filter(n => n.id !== id));
};

// Expose these via context provider
